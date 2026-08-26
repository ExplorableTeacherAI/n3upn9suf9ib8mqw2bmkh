import { type ReactElement } from "react";
import { StackLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import { EditableH2, EditableParagraph } from "@/components/atoms";

export const lettersConclusionBlocks: ReactElement[] = [
    <StackLayout key="layout-letters-wrapup-heading" maxWidth="xl">
        <Block id="letters-wrapup-heading" padding="md">
            <EditableH2 id="h2-letters-wrapup-heading" blockId="letters-wrapup-heading">
                Wrapping Up
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-letters-wrapup-insight" maxWidth="xl">
        <Block id="letters-wrapup-insight" padding="sm">
            <EditableParagraph id="para-letters-wrapup-insight" blockId="letters-wrapup-insight">
                A letter was never a mystery and never an object. It is a stand-in for a
                number nobody has told you yet, and the moment you know that number you can
                drop it into the letter's place and the algebra turns back into the
                arithmetic you have been doing for years. That is why the snack pack gave
                you n + 3 the instant you filled it, and why the cookie tile was the only
                one that refused to fit.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-letters-wrapup-next" maxWidth="xl">
        <Block id="letters-wrapup-next" padding="sm">
            <EditableParagraph id="para-letters-wrapup-next" blockId="letters-wrapup-next">
                The habit worth keeping is the one the bubble tea counter taught you: do the
                multiplying first, then add on what is added once. Next you will meet
                expressions where the number you want sits hidden on the far side of an
                equals sign, and the job becomes hunting it down rather than being handed
                it.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
