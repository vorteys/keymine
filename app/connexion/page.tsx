import { PixelShell } from "@/components/PixelShell";
import { PixelButton, PixelPanel } from "@/components/ui";

export default function ConnexionPage() {
  return (
    <PixelShell rightSlot={<PixelButton href="/" variant="slate" className="h-10 px-4 text-[11px]">INVITÉ</PixelButton>}>
      <div className="flex flex-col items-center gap-7 pt-6">
        <h1 className="font-pixel text-2xl text-white [text-shadow:4px_4px_0_#000]">
          DESCENDS DANS LA MINE
        </h1>

        <PixelPanel className="w-full max-w-xl p-7">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2.5">
              <PixelButton variant="green" className="flex-grow text-[13px]" href="/connexion">
                CONNEXION
              </PixelButton>
              <PixelButton variant="slate" className="flex-grow text-[13px]" href="/connexion">
                CRÉER UN COMPTE
              </PixelButton>
            </div>

            <label className="block">
              <span className="font-pixel mb-2 block text-[11px] text-[#3a3a3a]">
                NOM D&rsquo;UTILISATEUR
              </span>
              <input
                className="pixel-slot h-13 w-full px-3.5 text-3xl text-white"
                defaultValue=""
                placeholder="ton pseudo"
                name="username"
              />
            </label>

            <label className="block">
              <span className="font-pixel mb-2 block text-[11px] text-[#3a3a3a]">MOT DE PASSE</span>
              <input
                type="password"
                className="pixel-slot h-13 w-full px-3.5 text-3xl text-white"
                name="password"
              />
            </label>

            <label className="flex items-center gap-3 text-2xl">
              <input type="checkbox" className="h-5 w-5 accent-[#3f7d24]" defaultChecked />
              Se souvenir de moi
            </label>

            <PixelButton href="/" variant="green" className="h-16 text-lg">
              CONNEXION
            </PixelButton>

            <div className="flex items-center gap-3.5 text-[#3a3a3a]">
              <div className="h-1 flex-grow bg-[#8b8b8b]" />
              <span className="font-pixel text-[11px]">OU</span>
              <div className="h-1 flex-grow bg-[#8b8b8b]" />
            </div>

            <div className="flex gap-3">
              <a
                href="#"
                className="pixel-btn flex-grow border-[#a5adf5] border-b-[#2a3180] border-r-[#2a3180] bg-[#4752c4] text-[13px] text-white"
                style={{ height: "3.4rem" }}
              >
                DISCORD
              </a>
              <a
                href="#"
                className="pixel-btn flex-grow border-[#8a9199] border-b-[#0d1013] border-r-[#0d1013] bg-[#24292e] text-[13px] text-white"
                style={{ height: "3.4rem" }}
              >
                GITHUB
              </a>
            </div>

            <p className="text-2xl leading-tight text-[#3a3a3a]">
              Ta photo Discord ou GitHub sert de photo de profil. Tu pourras la changer ou en
              téléverser une autre.
            </p>
          </div>
        </PixelPanel>

        <div className="flex w-full max-w-xl flex-col gap-3.5 sm:flex-row">
          <div className="flex-1 border-4 border-black bg-[#fff8dc] p-3.5 text-2xl leading-tight text-black">
            Aucun courriel demandé. Mot de passe oublié? Pas de récupération: tu crées un nouveau
            compte.
          </div>
          <div className="flex-1 border-4 border-black bg-[#e6f3d8] p-3.5 text-2xl leading-tight text-black">
            Tu as joué en invité? Tes courses de la session s’ajoutent à ton compte quand tu te
            connectes.
          </div>
        </div>
      </div>
    </PixelShell>
  );
}
