"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { plannerQuestions } from "@/content/collections/planner-rules";
import { buildContactQuery, recommendCategories } from "@/lib/planner";
import type { PlannerAnswers } from "@/lib/planner";
import type { AuctionPlannerPage, PlannerOption } from "@/content/types";

/**
 * The auction planner wizard.
 *
 * Ungated by design: no email, no gate, results the moment the last question is
 * answered. Scoring happens in the browser from the table in
 * `planner-rules.ts`, so there is no round trip and no lead is required to see
 * the answer. The contact CTA on the results screen is an offer, not a toll.
 *
 * Nothing in here carries `.reveal`. RevealObserver snapshots
 * `.reveal:not(.in)` once per navigation, and every screen below the first
 * mounts after that snapshot — a `.reveal` here would sit at opacity 0 forever.
 * Same failure as the FAQ accordion; see RevealObserver.
 */

/** One card on the results screen. Supplied by the server component. */
export interface PlannerCategoryCard {
  id: string;
  title: string;
  /** The client's own description of the category, verbatim. */
  note: string;
  path: string;
  image: { src: string; alt: string };
}

type Screen = "start" | "questions" | "results";

export function AuctionPlanner({
  page,
  categories,
}: {
  page: AuctionPlannerPage;
  /** Every scoring category, keyed for lookup once the answers are in. */
  categories: PlannerCategoryCard[];
}) {
  const [screen, setScreen] = useState<Screen>("start");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<PlannerAnswers>({});

  // Focus lands here on every screen change. Without it, focus stays on the
  // button that was just clicked while the content around it is replaced, which
  // leaves a keyboard or screen reader user with no idea what happened.
  // A callback ref rather than a typed one: the heading is an <h2> on the start
  // and results screens and the <legend> on a question, and one RefObject
  // cannot be handed to both.
  const headingRef = useRef<HTMLElement | null>(null);
  const setHeading = (element: HTMLElement | null) => {
    headingRef.current = element;
  };
  const focusHeading = () => {
    // After paint, so the new heading exists to receive it.
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const question = plannerQuestions[step];
  const chosen = (question && answers[question.id]) ?? [];
  const isMulti = Boolean(question?.maxChoices);

  const recommended = useMemo(
    () => (screen === "results" ? recommendCategories(answers) : []),
    [screen, answers]
  );

  const picks = recommended
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is PlannerCategoryCard => Boolean(c));

  function choose(option: PlannerOption) {
    if (!question) return;

    if (!isMulti) {
      setAnswers((prev) => ({ ...prev, [question.id]: [option.id] }));
      advance();
      return;
    }

    setAnswers((prev) => {
      const current = prev[question.id] ?? [];

      // "Not sure" replaces everything and cannot be combined, so it stays a
      // real answer rather than one more box to tick alongside three others.
      if (option.exclusive) {
        return {
          ...prev,
          [question.id]: current.includes(option.id) ? [] : [option.id],
        };
      }

      const withoutExclusive = current.filter(
        (id) => !question.options.find((o) => o.id === id)?.exclusive
      );

      if (withoutExclusive.includes(option.id)) {
        return {
          ...prev,
          [question.id]: withoutExclusive.filter((id) => id !== option.id),
        };
      }

      if (withoutExclusive.length >= (question.maxChoices ?? 1)) return prev;
      return { ...prev, [question.id]: [...withoutExclusive, option.id] };
    });
  }

  function advance() {
    if (step + 1 < plannerQuestions.length) {
      setStep(step + 1);
    } else {
      setScreen("results");
    }
    focusHeading();
  }

  function back() {
    if (step === 0) {
      setScreen("start");
    } else {
      setStep(step - 1);
    }
    focusHeading();
  }

  function restart() {
    setAnswers({});
    setStep(0);
    setScreen("start");
    focusHeading();
  }

  /* ------------------------------------------------------------------ */
  /* Start                                                               */
  /* ------------------------------------------------------------------ */
  if (screen === "start") {
    return (
      <div className="planner">
        <h2 className="planner-heading" tabIndex={-1} ref={setHeading}>
          {page.intro.title}
        </h2>
        <p className="planner-lede">{page.intro.lede}</p>
        <p className="planner-blurb">{page.start.blurb}</p>
        <button
          type="button"
          className="btn btn-gold"
          onClick={() => {
            setScreen("questions");
            focusHeading();
          }}
        >
          {page.start.button}
        </button>
        <p className="planner-duration">{page.start.duration}</p>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Questions                                                           */
  /* ------------------------------------------------------------------ */
  if (screen === "questions" && question) {
    const total = plannerQuestions.length;
    const canContinue = chosen.length > 0;

    return (
      <div className="planner">
        <div
          className="planner-progress"
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label={`Question ${step + 1} of ${total}`}
        >
          <span
            className="planner-progress-bar"
            style={{ width: `${((step + 1) / total) * 100}%` }}
          />
        </div>
        <p className="planner-step">
          Question {step + 1} of {total}
        </p>

        <fieldset className="planner-fieldset">
          {/* The legend is the heading for this screen, so it takes focus on
              every step change. */}
          <legend className="planner-heading" tabIndex={-1} ref={setHeading}>
            {question.prompt}
          </legend>
          {question.help && <p className="planner-help">{question.help}</p>}

          <div className="planner-options">
            {question.options.map((option) => {
              const selected = chosen.includes(option.id);
              return (
                <label
                  key={option.id}
                  className="planner-option"
                  data-selected={selected}
                >
                  <input
                    type={isMulti ? "checkbox" : "radio"}
                    name={question.id}
                    value={option.id}
                    checked={selected}
                    onChange={() => choose(option)}
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="planner-nav">
          <button type="button" className="planner-back" onClick={back}>
            ← Back
          </button>
          {/* Single-select advances on choice, so the button only exists where
              it is needed: the multi-select question, which cannot know when
              you are done picking. */}
          {isMulti && (
            <button
              type="button"
              className="btn btn-gold"
              onClick={advance}
              disabled={!canContinue}
            >
              See my results
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Results                                                             */
  /* ------------------------------------------------------------------ */
  const contactHref = `/contact?${buildContactQuery(answers, recommended)}`;
  const format = answers.format ?? [];
  const isLiveAuction = format.includes("live") || format.includes("both");

  return (
    <div className="planner planner-results">
      <h2 className="planner-heading" tabIndex={-1} ref={setHeading}>
        {page.results.heading}
      </h2>
      <p className="planner-lede">{page.results.lede}</p>

      {/* Chips rather than a written sentence. With "Not sure yet" available on
          three of the five questions, generated prose reads as broken English
          often enough that echoing the labels plainly is simply better. */}
      <div className="planner-answers">
        <h3>{page.results.answersLabel}</h3>
        <ul>
          {plannerQuestions.map((q) => {
            const selected = answers[q.id] ?? [];
            return selected.map((id) => {
              const option = q.options.find((o) => o.id === id);
              return option ? (
                <li key={`${q.id}-${id}`}>{option.summaryLabel}</li>
              ) : null;
            });
          })}
        </ul>
      </div>

      <h3 className="planner-picks-heading">{page.results.picksHeading}</h3>
      {/* Rendered from the format answer rather than the score, because it is
          not competing with the categories — a live auction needs someone to
          run it whichever lots are in the room. */}
      <ol className="planner-picks">
        {picks.map((pick) => (
          <li key={pick.id} className="planner-pick">
            {/* `contain`, matching .cat-card-media: several category images are
                lot photographs, and cropping one to a 4:3 box slices the
                headstock off a guitar. */}
            <div className="planner-pick-media">
              <Image
                src={pick.image.src}
                alt={pick.image.alt}
                fill
                sizes="(max-width: 860px) 100vw, 33vw"
                style={{ objectFit: "contain" }}
              />
            </div>
            <div className="planner-pick-body">
              <h4>{pick.title}</h4>
              <p className="planner-pick-note">{pick.note}</p>
              <Link
                href={pick.path}
                className="planner-pick-link"
                aria-label={`View ${pick.title}`}
              >
                View these items
                <span aria-hidden="true"> →</span>
              </Link>
            </div>
          </li>
        ))}
      </ol>

      {isLiveAuction && (
        <div className="planner-auctioneer">
          <h3>{page.auctioneerCard.heading}</h3>
          <p>{page.auctioneerCard.body}</p>
          <Link href={page.auctioneerCard.href} className="planner-pick-link">
            {page.auctioneerCard.linkLabel}
            <span aria-hidden="true"> →</span>
          </Link>
        </div>
      )}

      <div className="planner-cta">
        <Link href={contactHref} className="btn btn-gold">
          {page.cta.label}
        </Link>
        <p className="planner-cta-note">Your answers come with you.</p>
        <div className="planner-cta-alt">
          <button type="button" className="planner-back" onClick={restart}>
            {page.results.restart}
          </button>
          <Link href="/auction-items">Browse all items</Link>
        </div>
      </div>
    </div>
  );
}
