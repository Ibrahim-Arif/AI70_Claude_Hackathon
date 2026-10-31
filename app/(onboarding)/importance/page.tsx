"use client";

import { useRouter } from "next/navigation";
import { ImportanceBlocks } from "@/components/ImportanceBlocks";
import { Screen } from "@/components/Screen";
import { BackButton, PrimaryButton } from "@/components/ui/Buttons";

export default function ImportancePage() {
  const router = useRouter();
  return (
    <Screen footer={<PrimaryButton onClick={() => router.push("/link")}>See my spending</PrimaryButton>}>
      <BackButton />
      <h1 className="head mt-3 text-h1 text-black">
        How much does each <span className="text-royal">matter</span>?
      </h1>
      <p className="mb-8 mt-3 font-serif text-body text-ink-2">Slide anywhere to set how strict we should be. The labels are landmarks, not limits.</p>
      <ImportanceBlocks />
    </Screen>
  );
}
