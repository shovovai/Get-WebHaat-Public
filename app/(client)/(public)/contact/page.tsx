import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, PhoneCall } from "lucide-react";
import Container from "@/components/Container";
import ContactForm from "@/components/info/ContactForm";
import { getSiteSettings } from "@/lib/siteSeo";
import { contactConfig } from "@/config/contact";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Call, email or message our support team — we're happy to help.",
};

export default async function ContactPage() {
  const { supportEmail, supportPhone } = await getSiteSettings();
  const phone = supportPhone || contactConfig.company.phone;
  const { company, businessHours } = contactConfig;

  const blocks = [
    {
      icon: PhoneCall,
      title: "Call us:",
      text: `We're available ${businessHours.weekday.replace(/^[^:]*:\s*/, "")}`,
      value: phone ? <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a> : null,
    },
    {
      icon: Mail,
      title: "Write to us:",
      text: "Submit the form and we'll contact you soon.",
      value: <a href={`mailto:${supportEmail}`}>{supportEmail}</a>,
    },
    {
      icon: MapPin,
      title: "Find us:",
      text: `${company.address}, ${company.city}`,
      value: <Link href="/help">Help center</Link>,
    },
  ];

  return (
    <Container className="py-10 lg:py-14">
      <h1 className="mb-10 text-center text-[36px] leading-tight text-ink sm:text-[48px]">Contact us</h1>
      <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[400px_minmax(0,1fr)]">
        <div className="rounded-xl bg-white p-6">
          {blocks.map(({ icon: Icon, title, text, value }, i) => (
            <div key={title} className={i > 0 ? "border-t border-black/10 pt-5" : ""}>
              <div className={`flex gap-3 ${i < blocks.length - 1 ? "pb-5" : ""}`}>
                <Icon className="mt-1 h-4 w-4 shrink-0 text-ink/70" strokeWidth={1.6} />
                <div>
                  <p className="text-lg text-ink">{title}</p>
                  <p className="mt-1 text-base text-light-color">{text}</p>
                  {value && <p className="mt-3 text-base font-medium text-ink">{value}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-white p-6">
          <ContactForm />
        </div>
      </div>
    </Container>
  );
}
