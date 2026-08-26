import { type ReactElement } from "react";
import { StackLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import { EditableH1, EditableParagraph } from "@/components/atoms";

export const lettersOrientationBlocks: ReactElement[] = [
    <StackLayout key="layout-letters-title" maxWidth="xl">
        <Block id="letters-title" padding="md">
            <EditableH1 id="h1-letters-title" blockId="letters-title">
                Letters Standing for Numbers
            </EditableH1>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-letters-hook" maxWidth="xl">
        <Block id="letters-hook" padding="sm">
            <EditableParagraph id="para-letters-hook" blockId="letters-hook">
                At the school canteen there is a snack pack with the sweets sealed inside.
                You cannot see how many are in there, but the number is real and it is
                sitting in the bag right now. Maths has a neat trick for a number like
                that: instead of leaving a gap, you give it a short name, usually a single
                letter.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-letters-promise" maxWidth="xl">
        <Block id="letters-promise" padding="sm">
            <EditableParagraph id="para-letters-promise" blockId="letters-promise">
                You have done this before without noticing. Every time you filled in a
                missing number box like 3 + ? = 10, you were handling a number nobody had
                told you yet. By the end of this page you will be able to put a real number
                in a letter's place and work out what expressions like n + 3 and 2 + 3n
                come to.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
