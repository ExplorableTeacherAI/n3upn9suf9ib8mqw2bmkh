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

// ── View constants ───────────────────────────────────────────────────────────

const VIEW_WIDTH = 600;
const VIEW_HEIGHT = 360;

const STACK_X = 72;
const STACK_TOP_Y = 96;
const STACK_SPACING = 36;

const TRAY = { x: 28, y: 272, width: 224, height: 60 };
const TRAY_CUP_Y = 302;

const INK = "#334155";
const INK_STRUCTURE = "#64748B";
const INK_QUIET = "#CBD5E1";
const PAPER = "#F8FAFC";
const ACCENT = "#62D0AD";
const PARTNER = "#8E90F5";
const FEE_INK = "#94A3B8";

const insideTray = (point: Vec2) =>
    point.x >= TRAY.x - 20 &&
    point.x <= TRAY.x + TRAY.width + 20 &&
    point.y >= TRAY.y - 20 &&
    point.y <= TRAY.y + TRAY.height + 20;

function CupShape({ cx, cy, fill, stroke }: { cx: number; cy: number; fill: string; stroke: string }) {
    return (
        <polygon
            points={`${cx - 17},${cy - 20} ${cx + 17},${cy - 20} ${cx + 13},${cy + 20} ${cx - 13},${cy + 20}`}
            fill={fill}
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
        />
    );
}

// ── The bespoke drawing ──────────────────────────────────────────────────────

function BubbleTeaDrawing() {
    const setVar = useSetVar();
    const cups = useVar<number>("cupsOrdered", 0);
    const highlight = useVar<string>("teaHighlight", "");

    const [drag, setDrag] = useState<{ from: "stack" | "tray"; point: Vec2 } | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const feeActive = highlight === "fee";
    const dim = (id: string) => (highlight && highlight !== id ? 0.35 : 1);
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
        if (drag.from === "stack" && insideTray(point)) {
            setVar("cupsOrdered", clamp(cups + 1, 0, MAX_CUPS));
        } else if (drag.from === "tray" && !insideTray(point)) {
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
            aria-label="A stack of bubble tea cups, a tray for the order, and the coins the order costs"
        >
            <defs>
                <filter id="bubble-tea-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            <g opacity={dim("cups")} style={ease}>
                <text x={STACK_X} y="66" fill={INK_STRUCTURE} fontSize="11" textAnchor="middle">
                    cup stack
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

                <text x={TRAY.x + TRAY.width / 2} y="262" fill={INK_STRUCTURE} fontSize="11" textAnchor="middle">
                    your order
                </text>
                <rect
                    x={TRAY.x}
                    y={TRAY.y}
                    width={TRAY.width}
                    height={TRAY.height}
                    rx="10"
                    fill="none"
                    stroke={INK_QUIET}
                    strokeWidth="2"
                    strokeDasharray="7 6"
                />
                {Array.from({ length: cups }, (_, index) => (
                    <CupShape key={index} cx={58 + index * 42} cy={TRAY_CUP_Y} fill={ACCENT} stroke={ACCENT} />
                ))}
            </g>

            {/* Coins on the counter */}
            <text x="300" y="70" fill={INK_STRUCTURE} fontSize="11" opacity={dim("coins-heading")} style={ease}>
                coins on the counter
            </text>

            <g>
                {feeActive && (
                    <g opacity="0.28">
                        <circle cx="430" cy="100" r="15" fill={FEE_INK} />
                        <circle cx="452" cy="100" r="15" fill={FEE_INK} />
                    </g>
                )}
                <text
                    x="300"
                    y="104"
                    fill={feeActive ? INK : INK_STRUCTURE}
                    fontSize="12"
                    fontWeight={feeActive ? 600 : 400}
                    opacity={highlight && !feeActive ? 0.35 : 1}
                    style={ease}
                >
                    carrier fee
                </text>
                <circle
                    cx="430"
                    cy="100"
                    r="9"
                    fill={FEE_INK}
                    stroke={feeActive ? INK : "none"}
                    strokeWidth={feeActive ? 2.5 : 0}
                    opacity={highlight && !feeActive ? 0.35 : 1}
                    onPointerEnter={() => setVar("teaHighlight", "fee")}
                    onPointerLeave={() => setVar("teaHighlight", "")}
                />
                <circle
                    cx="452"
                    cy="100"
                    r="9"
                    fill={FEE_INK}
                    stroke={feeActive ? INK : "none"}
                    strokeWidth={feeActive ? 2.5 : 0}
                    opacity={highlight && !feeActive ? 0.35 : 1}
                    onPointerEnter={() => setVar("teaHighlight", "fee")}
                    onPointerLeave={() => setVar("teaHighlight", "")}
                />
            </g>

            <g opacity={dim("cup-coins")} style={ease}>
                {Array.from({ length: cups }, (_, index) => (
                    <g key={index}>
                        <text x="300" y={140 + index * 34} fill={INK_STRUCTURE} fontSize="12">
                            {`cup ${index + 1}`}
                        </text>
                        {[430, 452, 474].map((cx) => (
                            <circle key={cx} cx={cx} cy={136 + index * 34} r="9" fill={PARTNER} />
                        ))}
                    </g>
                ))}
                {cups === 0 && (
                    <text x="300" y="142" fill={INK_QUIET} fontSize="12">
                        no cups on the tray yet
                    </text>
                )}
            </g>

            <text
                x="300"
                y="322"
                fill={INK}
                fontSize="15"
                opacity={dim("total")}
                style={{ ...ease, fontVariantNumeric: "tabular-nums" }}
            >
                {`2 + 3 × ${cups} = ${totalCoins} coins`}
            </text>

            {/* Drag surfaces: pick a cup off the stack, or take one back off the tray */}
            {remaining > 0 && (
                <rect
                    x={STACK_X - 32}
                    y={STACK_TOP_Y - 32}
                    width="64"
                    height={Math.max(64, remaining * STACK_SPACING + 24)}
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
            {cups > 0 && (
                <rect
                    x={TRAY.x}
                    y={TRAY.y}
                    width={TRAY.width}
                    height={TRAY.height}
                    fill="transparent"
                    style={{ cursor: drag ? "grabbing" : "grab", touchAction: "none" }}
                    onPointerDown={(event) => {
                        event.currentTarget.setPointerCapture(event.pointerId);
                        setDrag({ from: "tray", point: svgPoint(event) });
                    }}
                    onPointerMove={(event) => {
                        if (drag?.from !== "tray") return;
                        setDrag({ from: "tray", point: svgPoint(event) });
                    }}
                    onPointerUp={(event) => finishDrag(svgPoint(event))}
                    onPointerCancel={() => setDrag(null)}
                />
            )}

            {drag && (
                <g filter="url(#bubble-tea-shadow)" style={{ pointerEvents: "none" }}>
                    <CupShape cx={drag.point.x} cy={drag.point.y} fill={ACCENT} stroke={ACCENT} />
                </g>
            )}
        </svg>
    );
}

// ── Prediction cards (figure-local controls) ─────────────────────────────────

const totalLabel = (cups: number) => `there are ${CARRIER_FEE + COINS_PER_CUP * cups} on the counter`;

function RoutePrediction() {
    const setVar = useSetVar();
    const cups = useVar<number>("cupsOrdered", 0);
    const choice = useVar<string>("routeChoice", "");

    const addFirst = (CARRIER_FEE + COINS_PER_CUP) * cups;
    const multiplyFirst = CARRIER_FEE + COINS_PER_CUP * cups;

    const card = (id: string, title: string, formula: string, value: number) => {
        const selected = choice === id;
        return (
            <button
                type="button"
                onClick={() => setVar("routeChoice", id)}
                className="rounded-xl px-4 py-3 text-left transition-colors"
                style={{
                    backgroundColor: selected ? "rgba(98, 208, 173, 0.12)" : PAPER,
                    border: `2px solid ${selected ? ACCENT : "#E2E8F0"}`,
                }}
            >
                <div className="text-[12px] font-semibold" style={{ color: INK }}>
                    {title}
                </div>
                <div className="text-[13px]" style={{ color: INK_STRUCTURE, fontVariantNumeric: "tabular-nums" }}>
                    {`${formula} = ${value}`}
                </div>
            </button>
        );
    };

    return (
        <div className="px-6 pb-5">
            <div className="mb-2 text-[12px]" style={{ color: INK_STRUCTURE }}>
                Before you count the coins, pick the route you think will match them.
            </div>
            <div className="grid grid-cols-2 gap-3">
                {card("add first", "Add first", "(2 + 3) × n", addFirst)}
                {card("multiply first", "Multiply first", "2 + (3 × n)", multiplyFirst)}
            </div>
            {choice !== "" && cups > 0 && (
                <div
                    className="mt-3 text-[13px]"
                    style={{ color: choice === "multiply first" ? "#15803d" : "#B45309" }}
                >
                    {choice === "multiply first"
                        ? `The coins agree: ${totalLabel(cups)}.`
                        : `The coins say otherwise: ${totalLabel(cups)}, because the 2 coin fee is paid once, not once per cup.`}
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
                setVar("routeChoice", "");
                setVar("teaHighlight", "");
            }}
            caption="Each cup of bubble tea costs 3 coins and the carrier costs 2 coins once. Drag cups from the stack onto the tray, and drag one back off to cancel it."
        >
            <BubbleTeaDrawing />
            <RoutePrediction />
            <InteractionHintSequence
                hintKey="bubble-tea-cup-drag"
                steps={[
                    {
                        gesture: "drag",
                        label: "Drag a cup onto the tray",
                        position: { x: "12%", y: "27%" },
                        dragPath: { type: "line", startOffset: { x: -6, y: -14 }, endOffset: { x: 18, y: 40 } },
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
                    a flat 2 coins for the carrier
                </InlineLinkedHighlight>
                . Call the number of cups n, then drag cups onto the tray and watch the
                coins pile up beside them.
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
                The coins never lie. That carrier fee is paid once, not once for every cup,
                so the cups get multiplied first and the 2 joins on at the end. That is
                exactly what 2 + 3n means.
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
                cups on the tray the tea costs 3 × n = <TeaCoinsText /> coins, and the fee
                brings the order to <TeaTotalText /> coins in all.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bubble-tea-order-question" maxWidth="xl">
        <Block id="bubble-tea-order-question" padding="md">
            <EditableParagraph id="para-bubble-tea-order-question" blockId="bubble-tea-order-question">
                A friend orders 4 cups from the same stall. Counting the carrier fee, the
                number of coins that order costs is{" "}
                <InlineFeedback
                    varName="answerFourCups"
                    correctValue="14"
                    position="terminal"
                    successMessage="— exactly, 3 × 4 = 12 for the tea and one carrier fee of 2 on top"
                    failureMessage="— check whether the carrier fee has been handled once, and only once"
                    hint="The fee is paid once for the whole order, so multiply the cups before you add it"
                    visualizationHint={{
                        blockId: "bubble-tea-figure",
                        hintKey: "bubble-tea-hint-four-cups",
                        label: "Count it on the counter",
                        resetVars: { cupsOrdered: 0, routeChoice: "" },
                        steps: [
                            {
                                gesture: "drag",
                                label: "Drag cups onto the tray until 4 are there, then count the coins",
                                position: { x: "12%", y: "27%" },
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
