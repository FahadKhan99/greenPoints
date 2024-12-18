"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "./ui/button";
import { MapPin, Trash, Coins, Medal, Settings, Home } from "lucide-react";

const sidebarItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/report", label: "Report Waste", icon: MapPin },
  { href: "/collect", label: "Collect Waste", icon: Trash },
  { href: "/rewards", label: "Rewards", icon: Coins },
  { href: "/leaderboard", label: "Leaderboard", icon: Medal },
];

interface SidebarProps {
  open: boolean;
}

const Sidebar = ({ open }: SidebarProps) => {
  const pathname = usePathname();
  console.log("open", open);
  return (
    <aside
      className={` bg-white border-r border-gray-200 text-gray-800 pt-20 w-64 fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <nav className="flex flex-col justify-between h-full">
        <div className="px-4 py-6 space-x-8">
          {sidebarItems.map((item) => (
            <Link href={item.href} key={item.href} passHref>
              <Button
                variant={pathname === item.href ? "secondary" : "ghost"}
                className={`w-full flex items-center justify-start ${
                  pathname === item.href
                    ? "bg-green-100 text-green-800"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <item.icon className="mr-2 h-5 w-5" />
                <span className="text-base">{item.label}</span>
              </Button>
            </Link>
          ))}
        </div>
        <div className="border-t p-4 border-gray-200">
          <Link href="/settings" passHref>
            <Button
              variant={pathname === "/settings" ? "secondary" : "outline"}
              className={`w-full flex items-center justify-center ${
                pathname === "/settings"
                  ? "bg-green-100 text-green-800"
                  : "text-gray-600 border-gray-300 hover:bg-gray-100"
              }`}
            >
              <Settings className="w-5 h-5 mr-1" />
              <span className="text-base">Settings</span>
            </Button>
          </Link>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
