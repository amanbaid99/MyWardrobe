export function Privacy() {
  return (
    <section className="privacy-page">
      <p className="eyebrow">YOUR SPACE, YOUR CHOICE</p>
      <h1>Privacy & your data</h1>
      <p>
        Wardrobe stores the garment details you confirm, your preferences,
        outfit recommendations and any ratings you submit in the shared tracker
        Supabase project. Access is restricted to your account and explicit
        Wardrobe membership.
      </p>
      <h2>Photos and AI</h2>
      <p>
        AI text/photo capture sends your chosen input through OpenRouter to an
        AI provider only after you consent and request analysis. Provider
        retention policies apply; zero provider retention is not promised.
        Photos are resized and re-encoded on your device and processed
        transiently without being saved to Wardrobe storage. You review and
        confirm garment details before saving.
      </p>
      <h2>Shared account, separate wardrobe</h2>
      <p>
        Your sign-in identity is shared with the finance tracker. Changing its
        password affects that shared identity. Clearing Wardrobe data does not
        delete your finance records or your sign-in account.
      </p>
      <h2>Storage on this device</h2>
      <p>
        Your sign-in session is stored by Supabase in this browser. Garment and
        preference drafts stay in memory; they are cleared when you leave or
        reload. Wardrobe does not cache private inventory for offline browsing.
        Fonts are served with the app.
      </p>
      <h2>Export and deletion</h2>
      <p>
        Export your Wardrobe records from preferences. You can permanently clear
        your Wardrobe items, preferences, recommendations and feedback there,
        while retaining access to an empty wardrobe. Archived pieces remain part
        of your account until deleted.
      </p>
      <h2>Hosting</h2>
      <p>
        The production app is hosted on Vercel. Supabase provides authentication
        and storage. These services process normal operational requests needed
        to run the app. App code does not include garment-photo analytics or
        third-party advertising trackers.
      </p>
    </section>
  );
}
