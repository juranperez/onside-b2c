import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy — Onside",
  description:
    "How Onside collects, uses, and protects your data. A GDPR-aware privacy policy covering what we collect, our lawful basis, your rights, cookies, retention, and how to contact us.",
};

const LAST_UPDATED = "2 June 2026";
const CONTACT = "privacy@onsidemarket.com";

/** Shared section heading for the legal pages. */
function LegalSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-24">
      <h2 className="text-xl md:text-2xl display tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] text-mute leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-6 py-16 sm:py-20">
      <div className="max-w-[720px] mx-auto">
        {/* Hero */}
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-3 num">Legal</div>
        <h1 className="display text-[clamp(30px,5vw,46px)] leading-[1.04] tracking-[-0.04em]">
          Privacy <span className="font-serif italic font-normal text-acc">policy</span>
        </h1>
        <p className="text-[13px] text-mute-soft mt-4 num">Last updated: {LAST_UPDATED}</p>
        <p className="text-[16px] text-mute mt-5 leading-relaxed">
          Onside is a consumer football product that gives you transparent, model-based player valuations.
          This policy explains, in plain language, what personal data we collect, why, the lawful basis for
          it, how long we keep it, and the rights you have over it. We've written it to be GDPR-aware and to
          actually be read.
        </p>

        <LegalSection id="who-we-are" title="Who we are">
          <p>
            &ldquo;Onside&rdquo; (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates the Onside website and app. For
            the purposes of the UK GDPR and the EU GDPR, we are the <strong className="text-fg">data controller</strong>{" "}
            for the personal data described here. You can reach our privacy team at{" "}
            <a href={`mailto:${CONTACT}`} className="text-fg font-medium hover:text-acc transition">
              {CONTACT}
            </a>
            .
          </p>
        </LegalSection>

        <LegalSection id="what-we-collect" title="What we collect">
          <p>We keep data collection deliberately minimal. We collect:</p>
          <ul className="space-y-3 pl-1">
            <li className="flex gap-3">
              <span className="text-acc mt-1.5 text-[10px]">&#9679;</span>
              <span>
                <span className="text-fg font-medium">Account information.</span> When you create an
                account, your email address and a securely hashed password (or the identifier from a sign-in
                provider you choose). We never store your password in plain text.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-acc mt-1.5 text-[10px]">&#9679;</span>
              <span>
                <span className="text-fg font-medium">Watchlist &amp; preferences.</span> The players,
                clubs, and competitions you follow, your alert settings, and product preferences such as
                theme — the data that makes Onside yours.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-acc mt-1.5 text-[10px]">&#9679;</span>
              <span>
                <span className="text-fg font-medium">Anonymous analytics.</span> Aggregated, privacy-
                respecting usage data — pages viewed, broad device and browser type, approximate region — to
                understand what's working and fix what isn't. This is not used to build advertising profiles
                of you.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-acc mt-1.5 text-[10px]">&#9679;</span>
              <span>
                <span className="text-fg font-medium">Communications.</span> If you email us or contact
                support, we keep that correspondence so we can help you and keep a record of the request.
              </span>
            </li>
          </ul>
          <p>
            We do not knowingly collect data from children under 16, and Onside is not directed at them. We
            do not sell your personal data — to anyone, ever.
          </p>
        </LegalSection>

        <LegalSection id="how-we-use" title="How we use your data">
          <ul className="space-y-3 pl-1">
            <li className="flex gap-3">
              <span className="text-acc mt-1.5 text-[10px]">&#9679;</span>
              <span>To create and secure your account and keep you signed in.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-acc mt-1.5 text-[10px]">&#9679;</span>
              <span>To deliver core features — your watchlist, value alerts, and personalised views.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-acc mt-1.5 text-[10px]">&#9679;</span>
              <span>To understand and improve the product through aggregated analytics.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-acc mt-1.5 text-[10px]">&#9679;</span>
              <span>To respond to your questions and provide support.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-acc mt-1.5 text-[10px]">&#9679;</span>
              <span>To keep Onside safe — preventing abuse, fraud, and security incidents.</span>
            </li>
          </ul>
        </LegalSection>

        <LegalSection id="lawful-basis" title="Lawful basis for processing">
          <p>Under the GDPR we rely on the following legal bases:</p>
          <ul className="space-y-3 pl-1">
            <li className="flex gap-3">
              <span className="text-acc mt-1.5 text-[10px]">&#9679;</span>
              <span>
                <span className="text-fg font-medium">Contract.</span> Processing your account, watchlist,
                and preferences is necessary to provide the service you've signed up for.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-acc mt-1.5 text-[10px]">&#9679;</span>
              <span>
                <span className="text-fg font-medium">Consent.</span> Non-essential cookies and analytics
                run only where you've consented (see Cookies below). You can withdraw consent at any time.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-acc mt-1.5 text-[10px]">&#9679;</span>
              <span>
                <span className="text-fg font-medium">Legitimate interests.</span> Keeping the service
                secure and improving it, balanced against your rights and freedoms.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-acc mt-1.5 text-[10px]">&#9679;</span>
              <span>
                <span className="text-fg font-medium">Legal obligation.</span> Where we must retain or
                disclose data to comply with the law.
              </span>
            </li>
          </ul>
        </LegalSection>

        <LegalSection id="cookies" title="Cookies">
          <p>
            We use a small number of cookies and similar technologies. <strong className="text-fg">Essential
            cookies</strong> keep you signed in and the service functioning — these are required and can't be
            switched off. <strong className="text-fg">Analytics cookies</strong> help us measure usage in
            aggregate and run only with your consent.
          </p>
          <p>
            One essential cookie is worth naming. <strong className="text-fg">onside_anon</strong> is set only
            if you make a call on a transfer before creating an account. It exists solely so that call can be
            saved and attached to your record when you sign up — keeping the date you originally called it —
            and it is deleted the moment that happens. It holds nothing but a random identifier, is never used
            to track you across sites, and is never set for visitors who only read.
          </p>
          <p>
            When you first visit, we ask for your choice via a cookie banner, and we remember it. You can
            change your mind at any time by clearing the consent stored in your browser, and your browser's
            settings let you block or delete cookies entirely.
          </p>
        </LegalSection>

        <LegalSection id="your-rights" title="Your rights">
          <p>
            Wherever the GDPR applies, you have strong rights over your personal data, and we will honour
            them:
          </p>
          <ul className="space-y-3 pl-1">
            <li className="flex gap-3">
              <span className="text-acc mt-1.5 text-[10px]">&#9679;</span>
              <span>
                <span className="text-fg font-medium">Access.</span> Ask for a copy of the personal data we
                hold about you.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-acc mt-1.5 text-[10px]">&#9679;</span>
              <span>
                <span className="text-fg font-medium">Rectification.</span> Have inaccurate or incomplete
                data corrected.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-acc mt-1.5 text-[10px]">&#9679;</span>
              <span>
                <span className="text-fg font-medium">Erasure.</span> Ask us to delete your account and
                personal data (&ldquo;the right to be forgotten&rdquo;).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-acc mt-1.5 text-[10px]">&#9679;</span>
              <span>
                <span className="text-fg font-medium">Portability.</span> Receive your data in a portable,
                machine-readable format, or have us export it.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-acc mt-1.5 text-[10px]">&#9679;</span>
              <span>
                <span className="text-fg font-medium">Restriction &amp; objection.</span> Restrict or object
                to certain processing, including withdrawing consent for analytics.
              </span>
            </li>
          </ul>
          <p>
            To exercise any of these, email{" "}
            <a href={`mailto:${CONTACT}`} className="text-fg font-medium hover:text-acc transition">
              {CONTACT}
            </a>
            . We'll respond within one month. You also have the right to lodge a complaint with your local
            data protection authority.
          </p>
        </LegalSection>

        <LegalSection id="retention" title="Data retention">
          <p>
            We keep personal data only as long as we need it. Account data is retained while your account is
            active; if you delete your account, we erase or anonymise your personal data within{" "}
            <strong className="text-fg">30 days</strong>, except where we're legally required to keep
            certain records for longer. Anonymous analytics, which can't be tied back to you, may be retained
            in aggregate.
          </p>
        </LegalSection>

        <LegalSection id="sharing" title="Sharing &amp; processors">
          <p>
            We don't sell your data. We share it only with trusted service providers who process it on our
            behalf — for hosting, infrastructure, analytics, and email — under contracts that require them to
            protect it and use it only for the purposes we specify. Where data is transferred outside your
            region, we rely on appropriate safeguards such as Standard Contractual Clauses.
          </p>
        </LegalSection>

        <LegalSection id="security" title="Security">
          <p>
            We protect your data with industry-standard measures: encryption in transit, hashed credentials,
            access controls, and ongoing monitoring. No system is perfectly secure, but we take this
            seriously and will notify you and the relevant authority if a breach ever affects your rights.
          </p>
        </LegalSection>

        <LegalSection id="changes" title="Changes to this policy">
          <p>
            We may update this policy as Onside evolves. When we make material changes, we'll update the date
            at the top and, where appropriate, let you know in the app. Continuing to use Onside after an
            update means you accept the revised policy.
          </p>
        </LegalSection>

        <LegalSection id="contact" title="Contact us">
          <p>
            Questions about your privacy, or want to exercise a right? Email{" "}
            <a href={`mailto:${CONTACT}`} className="text-fg font-medium hover:text-acc transition">
              {CONTACT}
            </a>{" "}
            and we'll help.
          </p>
        </LegalSection>

        {/* Cross-link */}
        <div className="mt-12 pt-8 border-t border-line">
          <p className="text-[13px] text-mute-soft">
            See also our{" "}
            <Link href="/terms" className="text-mute hover:text-fg transition">
              Terms of use
            </Link>{" "}
            and{" "}
            <Link href="/methodology" className="text-mute hover:text-fg transition">
              the methodology
            </Link>{" "}
            behind our valuations.
          </p>
        </div>
      </div>
    </div>
  );
}
