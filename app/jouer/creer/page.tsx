import { AlreadyInRoom } from "@/components/lobby/AlreadyInRoom";
import { CreateRoomForm } from "@/components/lobby/CreateRoomForm";
import { PixelShell } from "@/components/PixelShell";
import { peekIdentity } from "@/lib/auth/identity";
import { translate } from "@/lib/i18n-dictionary";
import { getRequestLang, pageMetadata } from "@/lib/i18n-server";
import { findActiveRoom } from "@/lib/lobby";

export const dynamic = "force-dynamic";
export const generateMetadata = pageMetadata("title.create");

export default async function CreerCoursePage() {
  const [identity, lang] = await Promise.all([peekIdentity(), getRequestLang()]);
  // SALLE-06 : déjà dans une salle → pas de formulaire de création, on propose d'y retourner.
  const current = identity ? await findActiveRoom(identity) : undefined;

  return (
    <PixelShell active="jouer">
      {current ? (
        <>
          <h1 className="font-pixel mb-6 text-xl text-white [text-shadow:4px_4px_0_#000]">
            {translate(lang, "create.title")}
          </h1>
          <AlreadyInRoom code={current.code} />
        </>
      ) : (
        <CreateRoomForm />
      )}
    </PixelShell>
  );
}
