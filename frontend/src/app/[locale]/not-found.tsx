import { UserX } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function NotFound() {
  const t = await getTranslations("profile");

  return (
    <main className="mx-auto flex w-full max-w-content flex-col px-6 py-16">
      <Card>
        <EmptyState
          icon={UserX}
          title={t("notFoundTitle")}
          description={t("notFoundDescription")}
        />
      </Card>
    </main>
  );
}
