import { redirect } from "next/navigation";

// The "AI Coach" shipped as Ask Onside (/ask). This legacy route — still reachable
// from old links and footers — forwards there instead of dead-ending on a teaser.
export default function CoachPage() {
  redirect("/ask");
}
