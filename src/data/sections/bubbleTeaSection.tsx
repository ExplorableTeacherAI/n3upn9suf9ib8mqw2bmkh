import React, { useRef, useState, type ReactElement } from "react";
import { StackLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import {
    EditableH2,
    EditableParagraph,
    InlineScrubbleNumber,
    InlineLinkedHighlight,
    InlineClozeInput,
    InlineClozeChoice,
    InlineFeedback,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import { clamp, type Vec2 } from "@/lib/motion";
import {
    getVariableInfo,
    numberPropsFromDefinition,
    clozePropsFromDefinition,
    choicePropsFromDefinition,
    linkedHighlightPropsFromDefinition,
} from "../variables";

// ── Domain model ─────────────────────────────────────────────────────────────

const COINS_PER_CUP = 3;
const CARRIER_FEE = 2;
const MAX_CUPS = 5;
const GUESS_CUPS = 3;

// ── View constants ───────────────────────────────────────────────────────────

const VIEW_WIDTH = 600;
const VIEW_HEIGHT = 340;

const STACK_X = 66;
const STACK_TOP_Y = 92;
const STACK_SPACING = 34;
const ORDER_EDGE = 150; // anything dropped right of this joins the order

const CUP_FIRST_X = 200;
const CUP_SPACING = 62;
const CUP_Y = 116;
const COIN_Y = 164;
const COIN_RADIUS = 8;

const INK = "#334155";
const INK_STRUCTURE = "#64748B";
const INK_QUIET = "#CBD5E1";
const PAPER = "#F8FAFC";
const ACCENT = "#62D0AD";
const PARTNER = "#8E90F5";
const FEE_INK = "#94A3B8";

const cupX = (index: number) => CUP_FIRST_X + index * CUP_SPACING;

function CupShape({ cx, cy, fill, stroke, dashed }: { cx: number; cy: number; fill: string; stroke: string; dashed?: boolean }) {
    return (
        <polygon
            points={`${cx - 17},${cy - 20} ${cx + 17},${cy - 20} ${cx + 13},${cy + 20} ${cx - 13},${cy + 20}`}
            fill={fill}
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeDasharray={dashed ? "6 5" : undefined}
        />
    );
}

// ── The bespoke drawing ──────────────────────────────────────────────────────

function BubbleTeaDrawing() {
    const setVar = useSetVar();
    const cups = useVar<number>("cupsOrdered", 0);
    const highlight = useVar<string>("teaHighlight", "");

    const [drag, setDrag] = useState<{ from: "stack" | "order"; point: Vec2 } | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const feeActive = highlight === "fee";
    const dimmed = feeActive ? 0.35 : 1;
    const ease = { transition: "opacity 150ms ease-out" } as React.CSSProperties;

    const remaining = MAX_CUPS - cups;
    const teaCoins = COINS_PER_CUP * cups;
    const totalCoins = CARRIER_FEE + teaCoins;

    const svgPoint = (event: React.PointerEvent): Vec2 => {
        const svg = svgRef.current;
        if (!svg) return { x: 0, y: 0 };
        const rect = svg.getBoundingClientRect();
        return {
            x: ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH,
            y: ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT,
        };
    };

    const finishDrag = (point: Vec2) => {
        if (!drag) return;
        if (drag.from === "stack" && point.x > ORDER_EDGE) {
            setVar("cupsOrdered", clamp(cups + 1, 0, MAX_CUPS));
        } else if (drag.from === "order" && point.x < ORDER_EDGE) {
            setVar("cupsOrdered", clamp(cups - 1, 0, MAX_CUPS));
        }
        setDrag(null);
    };

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full"
            role="img"
            aria-label="A stack of bubble tea cups, the cups in the order with three coins under each one, and two carrier coins paid once"
        >
            <defs>
                <filter id="bubble-tea-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            <g opacity={dimmed} style={ease}>
                {/* The stack you drag from */}
                <text x={STACK_X} y="62" fill={INK_STRUCTURE} fontSize="11" textAnchor="middle">
                    cups
                </text>
                {Array.from({ length: remaining }, (_, index) => (
                    <CupShape
                        key={index}
                        cx={STACK_X}
                        cy={STACK_TOP_Y + index * STACK_SPACING}
                        fill={PAPER}
                        stroke={ACCENT}
                    />
                ))}

                {/* The order: every cup carries its own 3 coins */}
                {cups === 0 && (
                    <g>
                        <CupShape cx={CUP_FIRST_X} cy={CUP_Y} fill="none" stroke={INK_QUIET} dashed />
                        <text x="232" y="122" fill={INK_QUIET} fontSize="12">
                            drag a cup here
                        </text>
                    </g>
                )}
                {Array.from({ length: cups }, (_, index) => (
                    <g key={index}>
                        <CupShape cx={cupX(index)} cy={CUP_Y} fill={ACCENT} stroke={ACCENT} />
                        {[-18, 0, 18].map((offset) => (
                            <circle
                                key={offset}
                                cx={cupX(index) + offset}
                                cy={COIN_Y}
                                r={COIN_RADIUS}
                                fill={PARTNER}
                            />
                        ))}
                    </g>
                ))}
            </g>

            {/* The carrier fee: one small group, paid once */}
            <g opacity={feeActive || !highlight ? 1 : 0.35} style={ease}>
                {feeActive &&
                    [312, 336].map((cx) => <circle key={cx} cx={cx} cy="230" r="14" fill={FEE_INK} opacity="0.28" />)}
                <text
                    x="166"
                    y="234"
                    fill={feeActive ? INK : INK_STRUCTURE}
                    fontSize="12"
                    fontWeight={feeActive ? 600 : 400}
                >
                    carrier, paid once
                </text>
                {[312, 336].map((cx) => (
                    <circle
                        key={cx}
                        cx={cx}
                        cy="230"
                        r={COIN_RADIUS}
                        fill={FEE_INK}
                        stroke={feeActive ? INK : "none"}
                        strokeWidth={feeActive ? 2.5 : 0}
                        onPointerEnter={() => setVar("teaHighlight", "fee")}
                        onPointerLeave={() => setVar("teaHighlight", "")}
                    />
                ))}
            </g>

            {/* One plain arithmetic line */}
            <text
                x="166"
                y="300"
                fill={INK}
                fontSize="16"
                opacity={dimmed}
                style={{ ...ease, fontVariantNumeric: "tabular-nums" }}
            >
                {`${cups} × 3 = ${teaCoins}, then + 2 = ${totalCoins} coins`}
            </text>

            {/* Drag surfaces */}
            {remaining > 0 && (
                <rect
                    x={STACK_X - 30}
                    y="70"
                    width="60"
                    height={remaining * STACK_SPACING + 30}
                    fill="transparent"
                    style={{ cursor: drag ? "grabbing" : "grab", touchAction: "none" }}
                    onPointerDown={(event) => {
                        event.currentTarget.setPointerCapture(event.pointerId);
                        setDrag({ from: "stack", point: svgPoint(event) });
                    }}
                    onPointerMove={(event) => {
                        if (drag?.from !== "stack") return;
                        setDrag({ from: "stack", point: svgPoint(event) });
                    }}
                    onPointerUp={(event) => finishDrag(svgPoint(event))}
                    onPointerCancel={() => setDrag(null)}
                />
            )}
            {Array.from({ length: cups }, (_, index) => (
                <rect
                    key={index}
                    x={cupX(index) - 22}
                    y={CUP_Y - 26}
                    width="44"
                    height="52"
                    fill="transparent"
                    style={{ cursor: drag ? "grabbing" : "grab", touchAction: "none" }}
                    onPointerDown={(event) => {
                        event.currentTarget.setPointerCapture(event.pointerId);
                        setDrag({ from: "order", point: svgPoint(event) });
                    }}
                    onPointerMove={(event) => {
                        if (drag?.from !== "order") return;
                        setDrag({ from: "order", point: svgPoint(event) });
                    }}
                    onPointerUp={(event) => finishDrag(svgPoint(event))}
                    onPointerCancel={() => setDrag(null)}
                />
            ))}

            {drag && (
                <g filter="url(#bubble-tea-shadow)" style={{ pointerEvents: "none" }}>
                    <CupShape cx={drag.point.x} cy={drag.point.y} fill={ACCENT} stroke={ACCENT} />
                </g>
            )}
        </svg>
    );
}

// ── One guess, made before the order is built ────────────────────────────────

function CostGuess() {
    const setVar = useSetVar();
    const cups = useVar<number>("cupsOrdered", 0);
    const guess = useVar<string>("teaGuess", "");

    const realTotal = CARRIER_FEE + COINS_PER_CUP * GUESS_CUPS;
    const built = cups === GUESS_CUPS;
    const matched = guess === String(realTotal);

    return (
        <div className="px-6 pb-5">
            <div className="mb-2 text-[12px]" style={{ color: INK_STRUCTURE }}>
                Guess first: what will 3 cups cost altogether?
            </div>
            <div className="flex gap-3">
                {["9", "11", "15"].map((option) => {
                    const selected = guess === option;
                    return (
                        <button
                            key={option}
                            type="button"
                            onClick={() => setVar("teaGuess", option)}
                            className="rounded-xl px-5 py-2 text-[15px] font-semibold transition-colors"
                            style={{
                                backgroundColor: selected ? "rgba(98, 208, 173, 0.14)" : PAPER,
                                border: `2px solid ${selected ? ACCENT : "#E2E8F0"}`,
                                color: INK,
                                fontVariantNumeric: "tabular-nums",
                            }}
                        >
                            {option}
                        </button>
                    );
                })}
            </div>
            {guess !== "" && (
                <div
                    className="mt-3 text-[13px]"
                    style={{ color: built ? (matched ? "#15803d" : "#B45309") : INK_STRUCTURE }}
                >
                    {built
                        ? matched
                            ? "The counter agrees: 3 cups cost 11 coins."
                            : "The counter shows 11 coins: three lots of 3, and the carrier just once."
                        : "Now drag 3 cups across and count the coins."}
                </div>
            )}
        </div>
    );
}

function BubbleTeaFigure() {
    const setVar = useSetVar();

    return (
        <Figure
            id="bubble-tea-order"
            onReset={() => {
                setVar("cupsOrdered", 0);
                setVar("teaGuess", "");
                setVar("teaHighlight", "");
            }}
            caption="Every cup brings its own 3 coins, and the carrier costs 2 coins once. Drag a cup across to add it, or drag one back to the stack to take it off."
        >
            <BubbleTeaDrawing />
            <CostGuess />
            <InteractionHintSequence
                hintKey="bubble-tea-cup-drag"
                steps={[
                    {
                        gesture: "drag",
                        label: "Drag a cup across to the order",
                        position: { x: "11%", y: "27%" },
                        dragPath: { type: "line", startOffset: { x: -10, y: 0 }, endOffset: { x: 36, y: 0 } },
                    },
                ]}
            />
        </Figure>
    );
}

// ── Reactive prose readouts ──────────────────────────────────────────────────

function TeaCoinsText() {
    const cups = useVar<number>("cupsOrdered", 0);
    return <span style={{ color: PARTNER, fontWeight: 600 }}>{COINS_PER_CUP * cups}</span>;
}

function TeaTotalText() {
    const cups = useVar<number>("cupsOrdered", 0);
    return <span style={{ color: PARTNER, fontWeight: 600 }}>{CARRIER_FEE + COINS_PER_CUP * cups}</span>;
}

// ── Blocks ───────────────────────────────────────────────────────────────────

export const bubbleTeaBlocks: ReactElement[] = [
    <StackLayout key="layout-bubble-tea-heading" maxWidth="xl">
        <Block id="bubble-tea-heading" padding="md">
            <EditableH2 id="h2-bubble-tea-heading" blockId="bubble-tea-heading">
                Building 2 + 3n Step by Step
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bubble-tea-setup" maxWidth="xl">
        <Block id="bubble-tea-setup" padding="sm">
            <EditableParagraph id="para-bubble-tea-setup" blockId="bubble-tea-setup">
                Bubble tea costs 3 coins a cup, and the stall adds{" "}
                <InlineLinkedHighlight
                    varName="teaHighlight"
                    highlightId="fee"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo("teaHighlight"))}
                >
                    2 coins for the carrier
                </InlineLinkedHighlight>
                . Make your guess first, then drag cups across and watch each one bring its
                own 3 coins with it.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bubble-tea-figure" maxWidth="xl">
        <Block id="bubble-tea-figure" padding="sm" hasVisualization>
            <BubbleTeaFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bubble-tea-reflection" maxWidth="xl">
        <Block id="bubble-tea-reflection" padding="sm">
            <EditableParagraph id="para-bubble-tea-reflection" blockId="bubble-tea-reflection">
                The coins never lie. Only the cups multiply, because the carrier is paid
                once for the whole order, so you work out the cups first and add the 2 at
                the end. That is exactly what 2 + 3n means.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bubble-tea-worked-example" maxWidth="xl">
        <Block id="bubble-tea-worked-example" padding="sm">
            <EditableParagraph id="para-bubble-tea-worked-example" blockId="bubble-tea-worked-example">
                With{" "}
                <InlineScrubbleNumber
                    varName="cupsOrdered"
                    {...numberPropsFromDefinition(getVariableInfo("cupsOrdered"))}
                />{" "}
                cups in the order the tea costs 3 × n = <TeaCoinsText /> coins, and the
                carrier brings it to <TeaTotalText /> coins in all.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bubble-tea-order-question" maxWidth="xl">
        <Block id="bubble-tea-order-question" padding="md">
            <EditableParagraph id="para-bubble-tea-order-question" blockId="bubble-tea-order-question">
                A friend orders 4 cups from the same stall. Counting the carrier, the number
                of coins that order costs is{" "}
                <InlineFeedback
                    varName="answerFourCups"
                    correctValue="14"
                    position="terminal"
                    successMessage="— exactly, 3 × 4 = 12 for the tea and one carrier fee of 2 on top"
                    failureMessage="— check whether the carrier has been counted once, and only once"
                    hint="Work out the four cups first, then add the single carrier fee"
                    visualizationHint={{
                        blockId: "bubble-tea-figure",
                        hintKey: "bubble-tea-hint-four-cups",
                        label: "Count it on the counter",
                        resetVars: { cupsOrdered: 0 },
                        steps: [
                            {
                                gesture: "drag",
                                label: "Drag cups across until 4 are in the order, then count the coins",
                                position: { x: "11%", y: "27%" },
                                completionVar: "cupsOrdered",
                                completionValue: 4,
                                completionTolerance: 0.5,
                            },
                        ],
                    }}
                >
                    <InlineClozeChoice
                        varName="answerFourCups"
                        correctAnswer="14"
                        options={["12", "14", "20"]}
                        {...choicePropsFromDefinition(getVariableInfo("answerFourCups"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bubble-tea-practice" maxWidth="xl">
        <Block id="bubble-tea-practice" padding="md">
            <EditableParagraph id="para-bubble-tea-practice" blockId="bubble-tea-practice">
                A study group turns up and orders 7 cups. Putting 7 in place of n, the
                expression 2 + 3n comes to{" "}
                <InlineFeedback
                    varName="answerSevenCups"
                    correctValue="23"
                    position="terminal"
                    successMessage="— well done, 3 × 7 = 21 for the tea and 2 for the carrier"
                    failureMessage="— have another go"
                    hint="Do the 3 × 7 first, then add the single carrier fee"
                >
                    <InlineClozeInput
                        varName="answerSevenCups"
                        correctAnswer="23"
                        {...clozePropsFromDefinition(getVariableInfo("answerSevenCups"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
