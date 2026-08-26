import React, { useRef, useState, type ReactElement } from "react";
import { StackLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import {
    EditableH2,
    EditableParagraph,
    InlineScrubbleNumber,
    InlineLinkedHighlight,
    InlineClozeInput,
    InlineFeedback,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import { clamp, useSpring } from "@/lib/motion";
import {
    getVariableInfo,
    numberPropsFromDefinition,
    clozePropsFromDefinition,
    linkedHighlightPropsFromDefinition,
} from "../variables";

// ── View constants ───────────────────────────────────────────────────────────

const VIEW_WIDTH = 560;
const VIEW_HEIGHT = 340;

const PACK_LEFT = 78;
const PACK_WIDTH = 96;
const PACK_TOP = 60;
const PACK_BOTTOM = 248;
const PACK_CENTER_X = PACK_LEFT + PACK_WIDTH / 2;

const SWEET_RADIUS = 13;
const SWEET_SPACING = 19;
const SWEET_BASE_Y = 234;

const LOOSE_SWEETS = 3;
const LOOSE_X = [250, 288, 326];
const COUNTER_Y = 250;

const INK = "#334155";
const INK_STRUCTURE = "#64748B";
const INK_QUIET = "#CBD5E1";
const PAPER = "#F8FAFC";
const ACCENT = "#62D0AD";
const PARTNER = "#8E90F5";

const gripCenterY = (count: number) => SWEET_BASE_Y - (count - 1) * SWEET_SPACING - 24;

// ── The bespoke drawing ──────────────────────────────────────────────────────

function MysteryPackDrawing() {
    const setVar = useSetVar();
    const sweets = useVar<number>("sweetsInPack", 5);
    const highlight = useVar<string>("packHighlight", "");

    const [dragging, setDragging] = useState(false);
    const [hovered, setHovered] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);

    const packActive = highlight === "pack";
    const dimOthers = packActive ? 0.35 : 1;

    const gripY = useSpring(gripCenterY(sweets), { stiffness: 260, damping: 22 });
    const gripScale = useSpring(dragging || hovered ? 1.15 : 1, { stiffness: 400, damping: 26 });

    const pointerY = (event: React.PointerEvent): number => {
        const svg = svgRef.current;
        if (!svg) return 0;
        const rect = svg.getBoundingClientRect();
        return ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT;
    };

    const handlePointerMove = (event: React.PointerEvent<SVGRectElement>) => {
        if (!dragging) return;
        const y = pointerY(event);
        const next = Math.round((SWEET_BASE_Y - 24 - y) / SWEET_SPACING) + 1;
        setVar("sweetsInPack", clamp(next, 1, 8));
    };

    const total = sweets + LOOSE_SWEETS;
    const ease = { transition: "opacity 150ms ease-out" } as React.CSSProperties;

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full"
            role="img"
            aria-label="A sealed snack pack holding n sweets beside three loose sweets on the counter"
        >
            <defs>
                <filter id="mystery-pack-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            {/* Counter */}
            <g opacity={dimOthers} style={ease}>
                <line
                    x1="50"
                    y1={COUNTER_Y}
                    x2="360"
                    y2={COUNTER_Y}
                    stroke={INK_QUIET}
                    strokeWidth="2"
                    strokeLinecap="round"
                />
            </g>

            {/* The pack: halo first, then the outline, then the sweets inside */}
            {packActive && (
                <rect
                    x={PACK_LEFT - 4}
                    y={PACK_TOP - 4}
                    width={PACK_WIDTH + 8}
                    height={PACK_BOTTOM - PACK_TOP + 8}
                    rx="14"
                    fill="none"
                    stroke={ACCENT}
                    strokeWidth="9"
                    opacity="0.28"
                />
            )}
            <rect
                x={PACK_LEFT}
                y={PACK_TOP}
                width={PACK_WIDTH}
                height={PACK_BOTTOM - PACK_TOP}
                rx="10"
                fill={PAPER}
                stroke={packActive ? ACCENT : INK_STRUCTURE}
                strokeWidth={packActive ? 3.5 : 2}
                strokeLinejoin="round"
                style={{ transition: "stroke-width 150ms ease-out" }}
                onPointerEnter={() => setVar("packHighlight", "pack")}
                onPointerLeave={() => setVar("packHighlight", "")}
            />

            {Array.from({ length: sweets }, (_, index) => (
                <circle
                    key={index}
                    cx={PACK_CENTER_X}
                    cy={SWEET_BASE_Y - index * SWEET_SPACING}
                    r={SWEET_RADIUS}
                    fill={ACCENT}
                    opacity="0.9"
                />
            ))}

            {/* Draggable grip that sets how many sweets are hidden inside */}
            <g transform={`translate(${PACK_CENTER_X} ${gripY}) scale(${gripScale})`}>
                <rect x="-40" y="-6" width="80" height="12" rx="6" fill={ACCENT} filter="url(#mystery-pack-shadow)" />
                <circle cx="0" cy="0" r="4" fill={PAPER} />
            </g>
            <rect
                x={PACK_LEFT - 6}
                y={gripY - 22}
                width={PACK_WIDTH + 12}
                height="44"
                fill="transparent"
                style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
                onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setDragging(true);
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={() => setDragging(false)}
                onPointerCancel={() => setDragging(false)}
                onPointerEnter={() => setHovered(true)}
                onPointerLeave={() => setHovered(false)}
            />

            <g opacity={dimOthers} style={ease}>
                {/* The three loose sweets on the counter */}
                {LOOSE_X.slice(0, LOOSE_SWEETS).map((x) => (
                    <circle key={x} cx={x} cy={SWEET_BASE_Y} r={SWEET_RADIUS} fill={INK_STRUCTURE} opacity="0.85" />
                ))}

                {/* Direct labels under each group */}
                <text x={PACK_CENTER_X} y="276" fill={ACCENT} fontSize="20" fontWeight="600" textAnchor="middle">
                    n
                </text>
                <text x={LOOSE_X[1]} y="276" fill={INK} fontSize="20" fontWeight="600" textAnchor="middle">
                    3
                </text>

                {/* Bracket tying both groups to the total */}
                <path
                    d="M 64 292 L 64 300 L 344 300 L 344 292"
                    fill="none"
                    stroke={INK_QUIET}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <text
                    x="204"
                    y="320"
                    fill={PARTNER}
                    fontSize="14"
                    textAnchor="middle"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                >
                    {`${total} in all`}
                </text>

                {/* The same idea written as an expression */}
                <text x="450" y="152" fontSize="26" textAnchor="middle" style={{ fontVariantNumeric: "tabular-nums" }}>
                    <tspan fill={ACCENT} fontWeight="600">n</tspan>
                    <tspan fill={INK}> + 3 = </tspan>
                    <tspan fill={PARTNER} fontWeight="600">{total}</tspan>
                </text>
                <text
                    x="450"
                    y="186"
                    fill={INK_STRUCTURE}
                    fontSize="13"
                    textAnchor="middle"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                >
                    {`when n = ${sweets}`}
                </text>
            </g>
        </svg>
    );
}

function MysteryPackFigure() {
    const setVar = useSetVar();

    return (
        <Figure
            id="mystery-pack"
            onReset={() => setVar("sweetsInPack", 5)}
            caption="The sealed pack hides n sweets and three more sit loose on the counter. Drag the teal grip up or down to change what n is."
        >
            <MysteryPackDrawing />
            <InteractionHintSequence
                hintKey="mystery-pack-grip"
                steps={[
                    {
                        gesture: "drag-vertical",
                        label: "Drag the teal grip up or down",
                        position: { x: "22%", y: "39%" },
                        dragPath: { type: "line", startOffset: { x: 0, y: 18 }, endOffset: { x: 0, y: -22 } },
                    },
                ]}
            />
        </Figure>
    );
}

// ── Blocks ───────────────────────────────────────────────────────────────────

export const mysteryPackBlocks: ReactElement[] = [
    <StackLayout key="layout-mystery-pack-heading" maxWidth="xl">
        <Block id="mystery-pack-heading" padding="md">
            <EditableH2 id="h2-mystery-pack-heading" blockId="mystery-pack-heading">
                From Mystery Box to Letter
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-mystery-pack-setup" maxWidth="xl">
        <Block id="mystery-pack-setup" padding="sm">
            <EditableParagraph id="para-mystery-pack-setup" blockId="mystery-pack-setup">
                Here is that snack pack on the counter, and we have named the number inside
                it n. Drag the teal grip on top of{" "}
                <InlineLinkedHighlight
                    varName="packHighlight"
                    highlightId="pack"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo("packHighlight"))}
                >
                    the pack
                </InlineLinkedHighlight>{" "}
                to change how many sweets are hidden, and watch every place n appears move
                with it.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-mystery-pack-figure" maxWidth="xl">
        <Block id="mystery-pack-figure" padding="sm" hasVisualization>
            <MysteryPackFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-mystery-pack-reflection" maxWidth="xl">
        <Block id="mystery-pack-reflection" padding="sm">
            <EditableParagraph id="para-mystery-pack-reflection" blockId="mystery-pack-reflection">
                The letter is only a short name for whatever number is in the bag. With{" "}
                <InlineScrubbleNumber
                    varName="sweetsInPack"
                    {...numberPropsFromDefinition(getVariableInfo("sweetsInPack"))}
                />{" "}
                sweets sealed in and 3 loose ones beside it, the counter holds n + 3
                altogether, and that is why the expression keeps agreeing with the bracket
                underneath the sweets.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-mystery-pack-practice" maxWidth="xl">
        <Block id="mystery-pack-practice" padding="md">
            <EditableParagraph id="para-mystery-pack-practice" blockId="mystery-pack-practice">
                Suppose the canteen sold you a bigger pack holding 7 sweets. Keeping the
                same 3 loose sweets on the counter, n + 3 would come to{" "}
                <InlineFeedback
                    varName="answerPackTotal"
                    correctValue="10"
                    position="terminal"
                    successMessage="— exactly, you swapped 7 in for n and added the 3 that were already there"
                    failureMessage="— not yet"
                    hint="Put the 7 where the n is, then add the loose sweets"
                    visualizationHint={{
                        blockId: "mystery-pack-figure",
                        hintKey: "mystery-pack-hint-seven",
                        label: "Try it on the pack",
                        resetVars: { sweetsInPack: 5 },
                        steps: [
                            {
                                gesture: "drag-vertical",
                                label: "Drag the grip up until 7 sweets are in the pack",
                                position: { x: "22%", y: "39%" },
                                completionVar: "sweetsInPack",
                                completionValue: 7,
                                completionTolerance: 0.5,
                            },
                        ],
                    }}
                >
                    <InlineClozeInput
                        varName="answerPackTotal"
                        correctAnswer="10"
                        {...clozePropsFromDefinition(getVariableInfo("answerPackTotal"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
