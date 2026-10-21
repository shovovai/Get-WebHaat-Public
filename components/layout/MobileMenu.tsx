"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import type { NavCategory } from "../ClientHeader";

const MobileMenu = ({ categories = [] }: { categories?: NavCategory[] }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-ml-2 flex h-10 w-10 items-center justify-center lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6 text-ink" strokeWidth={1.6} />
      </button>
      <div className="lg:hidden">
        <Sidebar isOpen={open} onClose={() => setOpen(false)} categories={categories} />
      </div>
    </>
  );
};

export default MobileMenu;
