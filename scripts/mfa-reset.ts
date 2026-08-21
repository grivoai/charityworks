/**
 * Break-glass recovery for two-factor authentication.
 *
 * WHY THIS EXISTS, AND WHY IT WAS WRITTEN FIRST
 *
 * The admin panel has two accounts, no self-service password reset and no
 * "email me a recovery code" flow — all deliberate, and all of it means that an
 * enrolled authenticator app is a single point of failure. Lose the phone,
 * wipe it, or reinstall the authenticator without exporting, and the account is
 * locked out of the panel with no way back in from the browser.
 *
 * This is the way back in. It talks to Supabase Auth with the service role key,
 * which can delete an MFA factor on anyone's behalf. Deleting the factor drops
 * that account back to password-only; the next sign-in works as it did before
 * 2FA, and the user can enrol a new device from /admin/security.
 *
 * It was written and tested BEFORE the first enrolment on purpose. A recovery
 * path built after the trap is a recovery path nobody has ever run.
 *
 * USAGE
 *
 *   npm run mfa                       # list every account and its factors
 *   npm run mfa -- reset you@x.com    # show what would be removed (dry run)
 *   npm run mfa -- reset you@x.com --yes
 *
 * The dry run is the default for `reset`. `--yes` is required to actually
 * delete, so a half-remembered command typed in a hurry reports rather than
 * destroys.
 *
 * REQUIREMENTS
 *
 * SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL, which .env.local
 * already holds. If you are locked out and do not have .env.local to hand, both
 * are in the Vercel project settings under Environment Variables, and the
 * service key is in the Supabase dashboard under Project Settings > API.
 */

import { getServiceClient } from "@/lib/supabase";

/** An MFA factor as the admin API returns it. */
interface Factor {
  id: string;
  friendly_name?: string | null;
  factor_type: string;
  status: string;
  created_at?: string;
}

interface Account {
  id: string;
  email: string;
  /** From `admin_users`, so an auth account with no grant is visibly not an admin. */
  grant: string | null;
  factors: Factor[];
}

const RESET = "[0m";
const BOLD = "[1m";
const DIM = "[2m";
const RED = "[31m";
const GREEN = "[32m";
const YELLOW = "[33m";

function die(message: string): never {
  console.error(`\n${RED}${message}${RESET}\n`);
  process.exit(1);
}

/**
 * Every account in Supabase Auth, with its factors and its admin grant.
 *
 * Reads `auth.users` rather than `admin_users` as the source of truth for who
 * exists. Someone can hold a Supabase account, and therefore an MFA factor,
 * without an `admin_users` row — and if the recovery tool could not see such an
 * account it would be unable to fix the one case where the two tables have
 * drifted apart.
 */
async function loadAccounts(): Promise<Account[]> {
  const supabase = getServiceClient();

  const users: { id: string; email?: string }[] = [];
  // Paginated even though there are two accounts. A recovery script that
  // silently stops at the first page is a recovery script that one day cannot
  // see the account you need.
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) die(`Could not list accounts: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < 200) break;
  }

  const { data: grants, error: grantError } = await getServiceClient()
    .from("admin_users")
    .select("id, role")
    .returns<{ id: string; role: string }[]>();

  // Not fatal. The grant column is context, and the whole point of this script
  // is that it still works when other things are broken.
  if (grantError) {
    console.warn(
      `${YELLOW}Warning: could not read admin_users (${grantError.message}). ` +
        `Roles will show as unknown.${RESET}`
    );
  }
  const roleById = new Map((grants ?? []).map((g) => [g.id, g.role]));

  const accounts: Account[] = [];
  for (const user of users) {
    const { data, error } = await supabase.auth.admin.mfa.listFactors({
      userId: user.id,
    });
    if (error) die(`Could not list factors for ${user.email}: ${error.message}`);

    accounts.push({
      id: user.id,
      email: user.email ?? "(no email)",
      grant: roleById.get(user.id) ?? null,
      factors: (data?.factors ?? []) as Factor[],
    });
  }

  return accounts;
}

function describe(account: Account): string {
  const grant = account.grant ? `${account.grant}` : "no admin grant";
  const lines = [`${BOLD}${account.email}${RESET}  ${DIM}(${grant})${RESET}`];

  if (account.factors.length === 0) {
    lines.push(`    no factors — signs in with password only`);
    return lines.join("\n");
  }

  for (const factor of account.factors) {
    const verified = factor.status === "verified";
    const mark = verified ? `${GREEN}verified${RESET}` : `${YELLOW}${factor.status}${RESET}`;
    const name = factor.friendly_name?.trim() || "(unnamed)";
    lines.push(`    ${factor.factor_type}  ${name}  ${mark}`);
    lines.push(`    ${DIM}${factor.id}${RESET}`);
  }
  // Only verified factors are enforced at sign-in, so an account showing
  // nothing but unverified ones is NOT locked out and needs no reset.
  if (!account.factors.some((f) => f.status === "verified")) {
    lines.push(
      `    ${DIM}nothing verified here — this account is not being asked for a code${RESET}`
    );
  }
  return lines.join("\n");
}

async function list(): Promise<void> {
  const accounts = await loadAccounts();
  console.log(`\n${BOLD}Accounts and MFA factors${RESET}\n`);
  for (const account of accounts) console.log(describe(account), "\n");

  const enrolled = accounts.filter((a) =>
    a.factors.some((f) => f.status === "verified")
  );
  console.log(
    `${enrolled.length} of ${accounts.length} account(s) will be asked for a code at sign-in.\n`
  );
  if (enrolled.length > 0) {
    console.log(
      `${DIM}To remove 2FA from one of them:\n` +
        `  npm run mfa -- reset ${enrolled[0].email} --yes${RESET}\n`
    );
  }
}

async function reset(email: string, confirmed: boolean): Promise<void> {
  const accounts = await loadAccounts();
  const target = accounts.find(
    (a) => a.email.toLowerCase() === email.toLowerCase()
  );

  if (!target) {
    console.error(`\n${RED}No account with the email ${email}.${RESET}`);
    console.error(`Known accounts: ${accounts.map((a) => a.email).join(", ")}\n`);
    process.exit(1);
  }

  if (target.factors.length === 0) {
    console.log(
      `\n${GREEN}${target.email} has no MFA factors — nothing to remove.${RESET}`
    );
    console.log(`That account already signs in with just a password.\n`);
    return;
  }

  console.log(`\n${describe(target)}\n`);

  if (!confirmed) {
    console.log(
      `${YELLOW}Dry run.${RESET} This would delete ${target.factors.length} factor(s) ` +
        `and drop ${target.email} back to password-only sign-in.\n`
    );
    console.log(`Run it again with --yes to do it:\n`);
    console.log(`  npm run mfa -- reset ${target.email} --yes\n`);
    return;
  }

  const supabase = getServiceClient();
  let removed = 0;
  for (const factor of target.factors) {
    const { error } = await supabase.auth.admin.mfa.deleteFactor({
      userId: target.id,
      id: factor.id,
    });
    if (error) {
      console.error(`${RED}Could not delete ${factor.id}: ${error.message}${RESET}`);
      continue;
    }
    removed++;
    console.log(`${GREEN}removed${RESET} ${factor.factor_type} ${factor.id}`);
  }

  console.log(
    `\n${GREEN}Done.${RESET} ${removed} factor(s) removed. ${target.email} can now sign in ` +
      `with just a password.\n`
  );
  console.log(
    `${DIM}Any browser still holding that account's session keeps it until it expires — ` +
      `the factor is gone, so nothing will ask for a code again. Re-enrol from ` +
      `/admin/security once you have the new device.${RESET}\n`
  );
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  const confirmed = rest.includes("--yes");
  const args = rest.filter((a) => !a.startsWith("--"));

  if (!command || command === "list") return list();

  if (command === "reset") {
    const email = args[0];
    if (!email) {
      die(
        "Which account?\n\n" +
          "  npm run mfa -- reset you@example.com\n\n" +
          "Run `npm run mfa` on its own to see the accounts."
      );
    }
    return reset(email, confirmed);
  }

  die(
    `Unknown command "${command}".\n\n` +
      "  npm run mfa                        list accounts and factors\n" +
      "  npm run mfa -- reset <email>       dry run\n" +
      "  npm run mfa -- reset <email> --yes remove that account's factors"
  );
}

main().catch((error) => {
  console.error(`\n${RED}${error instanceof Error ? error.stack : error}${RESET}\n`);
  process.exit(1);
});
