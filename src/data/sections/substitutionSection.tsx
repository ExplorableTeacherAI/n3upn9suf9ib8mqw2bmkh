import React, { useEffect, useRef, useState, type ReactElement } from "react";
import { StackLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import {
    EditableH2,
    EditableParagraph,
    InlineLinkedHighlight,
    InlineClozeInput,
    InlineClozeChoice,
    InlineFeedback,
    InlineFormula,
    InlineTrigger,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import { useSpring, vec2, type Vec2 } from "@/lib/motion";
import {
    getVariableInfo,
    clozePropsFromDefinition,
    choicePropsFromDefinition,
    linkedHighlightPropsFromDefinition,
} from "../variables";

// ── View constants ───────────────────────────────────────────────────────────

const VIEW_WIDTH = 560;
const VIEW_HEIGHT = 360;

const SLOT_X = 200;
const SLOT_Y = 90;
const SLOT_SIZE = 60;
const SLOT_CENTER: Vec2 = { x: SLOT_X + SLOT_SIZE / 2, y: SLOT_Y + SLOT_SIZE / 2 };
const SNAP_RADIUS = 78;

const TILE_SIZE = 56;
const TILE_Y = 246;

const INK = "#334155";
const INK_STRUCTURE = "#64748B";
const INK_QUIET = "#CBD5E1";
const PAPER = "#F8FAFC";
const ACCENT = "#62D0AD";
const PARTNER = "#8E90F5";
const CAUTION = "#F7B23B";
const FIXED = "#F8A0CD"; // the number that is added once (the + 4)
const COOKIE = "#FFCBA4";

interface Tile {
    id: string;
    centerX: number;
    value: number | null;
}

const TILES: Tile[] = [
    { id: "three", centerX: 180, value: 3 },
    { id: "six", centerX: 262, value: 6 },
    { id: "cookie", centerX: 344, value: null },
];

// ── The bespoke drawing ──────────────────────────────────────────────────────

function SubstitutionDrawing() {
    const setVar = useSetVar();
    const letterValue = useVar<number>("letterValue", 0);
    const highlight = useVar<string>("cookieHighlight", "");

    const [drag, setDrag] = useState<{ id: string; point: Vec2 } | null>(null);
    const [rejected, setRejected] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!rejected) return;
        const timer = window.setTimeout(() => setRejected(false), 2600);
        return () => window.clearTimeout(timer);
    }, [rejected]);

    const slotActive = highlight === "slot";
    const cookieActive = highlight === "cookie";
    const dim = (id: string) => (highlight && highlight !== id ? 0.35 : 1);
    const ease = { transition: "opacity 150ms ease-out" } as React.CSSProperties;

    const slotScale = useSpring(slotActive ? 1.06 : 1, { stiffness: 320, damping: 24 });
    const filled = letterValue > 0;
    const result = letterValue + 4;

    const svgPoint = (event: React.PointerEvent): Vec2 => {
        const svg = svgRef.current;
        if (!svg) return { x: 0, y: 0 };
        const rect = svg.getBoundingClientRect();
        return {
            x: ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH,
            y: ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT,
        };
    };

    const finishDrag = (tile: Tile, point: Vec2) => {
        const overSlot = vec2.dist(point, SLOT_CENTER) < SNAP_RADIUS;
        if (overSlot) {
            if (tile.value === null) setRejected(true);
            else {
                setVar("letterValue", tile.value);
                setRejected(false);
            }
        }
        setDrag(null);
    };

    const renderTileFace = (tile: Tile, x: number, y: number, active: boolean) => {
        const isCookie = tile.value === null;
        return (
            <g key={`${tile.id}-face`}>
                <rect
                    x={x - TILE_SIZE / 2}
                    y={y - TILE_SIZE / 2}
                    width={TILE_SIZE}
                    height={TILE_SIZE}
                    rx="12"
                    fill={isCookie ? PAPER : ACCENT}
                    stroke={isCookie ? INK_STRUCTURE : ACCENT}
                    strokeWidth={active ? 3.5 : 2}
                    style={{ transition: "stroke-width 150ms ease-out" }}
                />
                {isCookie ? (
                    <g>
                        <circle cx={x} cy={y} r="16" fill={COOKIE} stroke={INK_STRUCTURE} strokeWidth="1.5" />
                        <circle cx={x - 5} cy={y - 4} r="2.4" fill={INK_STRUCTURE} />
                        <circle cx={x + 6} cy={y - 1} r="2.4" fill={INK_STRUCTURE} />
                        <circle cx={x - 1} cy={y + 7} r="2.4" fill={INK_STRUCTURE} />
                    </g>
                ) : (
                    <text x={x} y={y + 9} fill="#FFFFFF" fontSize="26" fontWeight="600" textAnchor="middle">
                        {tile.value}
                    </text>
                )}
            </g>
        );
    };

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full"
            role="img"
            aria-label="A jar of c cookies beside the expression c plus 4, with number tiles that can be dragged into the letter's box"
        >
            <defs>
                <filter id="substitution-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            {/* The jar: c cookies, count unknown */}
            <g opacity={dim("jar")} style={ease}>
                <rect x="40" y="70" width="88" height="16" rx="5" fill={INK_QUIET} />
                <rect
                    x="46"
                    y="86"
                    width="76"
                    height="92"
                    rx="10"
                    fill={PAPER}
                    stroke={INK_STRUCTURE}
                    strokeWidth="2"
                />
                <text x="84" y="146" fill={INK_QUIET} fontSize="34" fontWeight="600" textAnchor="middle">
                    ?
                </text>
                <text x="84" y="200" fill={INK_STRUCTURE} fontSize="12" textAnchor="middle">
                    c cookies inside
                </text>
            </g>

            {/* The expression, with the letter's box waiting for a number */}
            <g opacity={dim("slot")} style={ease}>
                {slotActive && (
                    <rect
                        x={SLOT_X - 5}
                        y={SLOT_Y - 5}
                        width={SLOT_SIZE + 10}
                        height={SLOT_SIZE + 10}
                        rx="14"
                        fill="none"
                        stroke={ACCENT}
                        strokeWidth="9"
                        opacity="0.28"
                    />
                )}
                <g transform={`translate(${SLOT_CENTER.x} ${SLOT_CENTER.y}) scale(${slotScale}) translate(${-SLOT_CENTER.x} ${-SLOT_CENTER.y})`}>
                    <rect
                        x={SLOT_X}
                        y={SLOT_Y}
                        width={SLOT_SIZE}
                        height={SLOT_SIZE}
                        rx="10"
                        fill={filled ? ACCENT : PAPER}
                        stroke={ACCENT}
                        strokeWidth={slotActive ? 3.5 : 2}
                        strokeDasharray={filled ? undefined : "6 5"}
                        style={{ transition: "stroke-width 150ms ease-out" }}
                        onPointerEnter={() => setVar("cookieHighlight", "slot")}
                        onPointerLeave={() => setVar("cookieHighlight", "")}
                    />
                    <text
                        x={SLOT_CENTER.x}
                        y={SLOT_CENTER.y + 10}
                        fill={filled ? "#FFFFFF" : ACCENT}
                        fontSize="28"
                        fontWeight="600"
                        textAnchor="middle"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                        {filled ? letterValue : "c"}
                    </text>
                </g>
                <text x="288" y="132" fill={INK} fontSize="30">
                    <tspan fill={INK}>+ </tspan>
                    <tspan fill={FIXED} fontWeight="600">4</tspan>
                </text>
                <text x="364" y="132" fill={INK} fontSize="30">
                    =
                </text>
                <text
                    x="400"
                    y="132"
                    fill={filled ? PARTNER : INK_QUIET}
                    fontSize="30"
                    fontWeight="600"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                >
                    {filled ? result : "?"}
                </text>
            </g>

            {/* Tiles waiting on the bench */}
            {TILES.map((tile) => {
                const active = tile.id === "cookie" ? cookieActive : false;
                const groupOpacity = tile.id === "cookie" ? dim("cookie") : dim(tile.id);
                return (
                    <g key={tile.id} opacity={drag?.id === tile.id ? 0.25 : groupOpacity} style={ease}>
                        {tile.id === "cookie" && cookieActive && (
                            <rect
                                x={tile.centerX - TILE_SIZE / 2 - 5}
                                y={TILE_Y - TILE_SIZE / 2 - 5}
                                width={TILE_SIZE + 10}
                                height={TILE_SIZE + 10}
                                rx="16"
                                fill="none"
                                stroke={ACCENT}
                                strokeWidth="9"
                                opacity="0.28"
                            />
                        )}
                        {renderTileFace(tile, tile.centerX, TILE_Y, active)}
                    </g>
                );
            })}

            {/* Oversized hit areas for the tiles */}
            {TILES.map((tile) => (
                <rect
                    key={`${tile.id}-hit`}
                    x={tile.centerX - 34}
                    y={TILE_Y - 34}
                    width="68"
                    height="68"
                    fill="transparent"
                    style={{ cursor: drag ? "grabbing" : "grab", touchAction: "none" }}
                    onPointerDown={(event) => {
                        event.currentTarget.setPointerCapture(event.pointerId);
                        setDrag({ id: tile.id, point: svgPoint(event) });
                    }}
                    onPointerMove={(event) => {
                        if (drag?.id !== tile.id) return;
                        setDrag({ id: tile.id, point: svgPoint(event) });
                    }}
                    onPointerUp={(event) => {
                        if (drag?.id !== tile.id) return;
                        finishDrag(tile, svgPoint(event));
                    }}
                    onPointerCancel={() => setDrag(null)}
                    onPointerEnter={() => tile.id === "cookie" && setVar("cookieHighlight", "cookie")}
                    onPointerLeave={() => tile.id === "cookie" && setVar("cookieHighlight", "")}
                />
            ))}

            {/* The tile currently in the student's hand */}
            {drag && (
                <g filter="url(#substitution-shadow)" style={{ pointerEvents: "none" }}>
                    {renderTileFace(
                        TILES.find((tile) => tile.id === drag.id) as Tile,
                        drag.point.x,
                        drag.point.y,
                        false,
                    )}
                </g>
            )}

            {rejected && (
                <text x="280" y="330" fill={CAUTION} fontSize="14" textAnchor="middle">
                    A letter's place holds a number. A cookie is not a number.
                </text>
            )}
        </svg>
    );
}

function SubstitutionFigure() {
    const setVar = useSetVar();

    return (
        <Figure
            id="substitution-slot"
            onReset={() => {
                setVar("letterValue", 0);
                setVar("cookieHighlight", "");
            }}
            caption="The jar holds c cookies. Drag a tile from the bench into the letter's box and see what c + 4 becomes, then try the cookie tile."
        >
            <SubstitutionDrawing />
            <InteractionHintSequence
                hintKey="substitution-tile-drag"
                steps={[
                    {
                        gesture: "drag",
                        label: "Drag a number tile into the box",
                        position: { x: "32%", y: "68%" },
                        dragPath: { type: "line", startOffset: { x: 0, y: 18 }, endOffset: { x: 14, y: -34 } },
                    },
                ]}
            />
        </Figure>
    );
}

// ── Blocks ───────────────────────────────────────────────────────────────────

export const substitutionBlocks: ReactElement[] = [
    <StackLayout key="layout-substitution-heading" maxWidth="xl">
        <Block id="substitution-heading" padding="md">
            <EditableH2 id="h2-substitution-heading" blockId="substitution-heading">
                A Letter Is a Number, Not a Thing
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-substitution-setup" maxWidth="xl">
        <Block id="substitution-setup" padding="sm">
            <EditableParagraph id="para-substitution-setup" blockId="substitution-setup">
                Here is the trap. The letter <InlineFormula id="formula-substitution-setup-c" latex="\clr{letter}{c}" colorMap={{ letter: "#62D0AD" }} />{" "}
                is not a cookie, it is the number of cookies,
                so a real number can stand in its place. Drag a tile into{" "}
                <InlineLinkedHighlight
                    varName="cookieHighlight"
                    highlightId="slot"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo("cookieHighlight"))}
                >
                    the empty box
                </InlineLinkedHighlight>{" "}
                and watch <InlineFormula id="formula-substitution-setup-expression" latex="\clr{letter}{c} + \clr{fixed}{4}" colorMap={{ letter: "#62D0AD", fixed: "#F8A0CD" }} />{" "}
                turn into ordinary arithmetic.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-substitution-figure" maxWidth="xl">
        <Block id="substitution-figure" padding="sm" hasVisualization>
            <SubstitutionFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-substitution-reflection" maxWidth="xl">
        <Block id="substitution-reflection" padding="sm">
            <EditableParagraph id="para-substitution-reflection" blockId="substitution-reflection">
                <InlineLinkedHighlight
                    varName="cookieHighlight"
                    highlightId="cookie"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo("cookieHighlight"))}
                >
                    The cookie tile
                </InlineLinkedHighlight>{" "}
                bounces straight back out, and that is the whole point: only numbers fit
                where a letter sits.{" "}
                <InlineTrigger
                    id="trigger-substitution-swap-three"
                    varName="letterValue"
                    value={3}
                    color="#2A9D7C"
                    bgColor="rgba(98, 208, 173, 0.18)"
                >
                    Swap in 3
                </InlineTrigger>{" "}
                and the box reads <InlineFormula id="formula-substitution-reflection-seven" latex="\clr{total}{7}" colorMap={{ total: "#8E90F5" }} />,{" "}
                <InlineTrigger
                    id="trigger-substitution-swap-six"
                    varName="letterValue"
                    value={6}
                    color="#2A9D7C"
                    bgColor="rgba(98, 208, 173, 0.18)"
                >
                    swap in 6
                </InlineTrigger>{" "}
                and it reads <InlineFormula id="formula-substitution-reflection-ten" latex="\clr{total}{10}" colorMap={{ total: "#8E90F5" }} />.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-substitution-meaning-question" maxWidth="xl">
        <Block id="substitution-meaning-question" padding="md">
            <EditableParagraph id="para-substitution-meaning-question" blockId="substitution-meaning-question">
                So in the expression <InlineFormula id="formula-substitution-meaning-expression" latex="\clr{letter}{c} + \clr{fixed}{4}" colorMap={{ letter: "#62D0AD", fixed: "#F8A0CD" }} />,
                the letter <InlineFormula id="formula-substitution-meaning-c" latex="\clr{letter}{c}" colorMap={{ letter: "#62D0AD" }} />{" "}
                stands for{" "}
                <InlineFeedback
                    varName="answerLetterMeaning"
                    correctValue="a number"
                    position="terminal"
                    successMessage="— yes, and that is why you can drop a real number into its place"
                    failureMessage="— this is the mix-up worth clearing up"
                    hint="A letter never stands for an object, it stands for how many of them there are"
                    visualizationHint={{
                        blockId: "substitution-figure",
                        hintKey: "substitution-hint-meaning",
                        label: "Try it yourself",
                        resetVars: { letterValue: 0, cookieHighlight: "" },
                        steps: [
                            {
                                gesture: "drag",
                                label: "Drag the 3 tile into the box — the letter gives way to a number",
                                position: { x: "32%", y: "68%" },
                                completionVar: "letterValue",
                                completionValue: 3,
                                completionTolerance: 0.5,
                            },
                        ],
                    }}
                >
                    <InlineClozeChoice
                        varName="answerLetterMeaning"
                        correctAnswer="a number"
                        options={["a cookie", "a number", "the jar"]}
                        {...choicePropsFromDefinition(getVariableInfo("answerLetterMeaning"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-substitution-practice" maxWidth="xl">
        <Block id="substitution-practice" padding="md">
            <EditableParagraph id="para-substitution-practice" blockId="substitution-practice">
                A jar is opened and counted: it holds{" "}
                <InlineFormula id="formula-substitution-practice-eight" latex="\clr{letter}{8}" colorMap={{ letter: "#62D0AD" }} />{" "}
                cookies. That makes <InlineFormula id="formula-substitution-practice-expression" latex="\clr{letter}{c} + \clr{fixed}{4}" colorMap={{ letter: "#62D0AD", fixed: "#F8A0CD" }} />{" "}
                equal to{" "}
                <InlineFeedback
                    varName="answerSubstituteEight"
                    correctValue="12"
                    position="terminal"
                    successMessage="— spot on, 8 took the letter's place and 8 + 4 = 12"
                    failureMessage="— close, try once more"
                    hint="Write the 8 where the c is, then do the adding"
                >
                    <InlineClozeInput
                        varName="answerSubstituteEight"
                        correctAnswer="12"
                        {...clozePropsFromDefinition(getVariableInfo("answerSubstituteEight"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
