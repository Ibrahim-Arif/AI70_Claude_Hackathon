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
      <h1 className="head mb-8 mt-3 text-h1 text-black">How much does each matter?</h1>
      <ImportanceBlocks />
    </Screen>
  );
}
