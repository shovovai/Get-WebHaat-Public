"use client";
import { Facebook, Instagram, Linkedin, Music2, Twitter, Youtube } from "lucide-react";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  iconClassName?: string;
  tooltipClassName?: string;
}



const SocialMedia = ({ className, iconClassName, tooltipClassName }: Props) => {
  const { social } = useSiteSettings();
  const socialLink = [
    { title: "Facebook", href: social.facebook, icon: <Facebook className="w-5 h-5" /> },
    { title: "Instagram", href: social.instagram, icon: <Instagram className="w-5 h-5" /> },
    { title: "X / Twitter", href: social.twitter, icon: <Twitter className="w-5 h-5" /> },
    { title: "LinkedIn", href: social.linkedin, icon: <Linkedin className="w-5 h-5" /> },
    { title: "YouTube", href: social.youtube, icon: <Youtube className="w-5 h-5" /> },
    { title: "TikTok", href: social.tiktok, icon: <Music2 className="w-5 h-5" /> },
  ].filter((item) => item.href);

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-3.5 text-zinc-400", className)}>
        {socialLink.map((item) => (
          <Tooltip key={item.title}>
            <TooltipTrigger asChild>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "p-2 border rounded-full hover:text-white hover:border-shop_dark_green hoverEffect",
                  iconClassName
                )}
              >
                {item.icon}
              </a>
            </TooltipTrigger>
            <TooltipContent
              className={cn(
                "bg-white text-dark-color font-semibold",
                tooltipClassName
              )}
            >
              {item.title}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};

export default SocialMedia;
