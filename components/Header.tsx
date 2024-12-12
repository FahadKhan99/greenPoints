"use client";

import {
  Leaf,
  Menu,
  Coins,
  Search,
  Bell,
  User,
  ChevronDown,
  LogIn,
  LogOut,
} from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// for web3 auth (the baddest decision ever ig due to complexiticity)
import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, IProvider, WEB3AUTH_NETWORK } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";

import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import {
  createUser,
  getUnreadNotification,
  getUserBalance,
  getUserByEmail,
  markNotificationAsRead,
} from "@/utils/db/actions";

import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Notifications } from "@/utils/types";
import { Users } from "@/utils/types";

const clientId = process.env.WEB3_AUTH_CLIENT_ID!;

// this is blockchain part
const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0xaa36a7",
  rpcTarget: "https://rpc.ankr.com/eth_sepolia",
  displayName: "Sepolia Testnet",
  blockExplorerUrl: "https://sepolia.etherscan.io", // Etherscan for Sepolia
  ticker: "ETH", // Currency symbol
  tickerName: "Ethereum", // Currency name
  logo: "https://assets.web3auth.io/evm-chains/sepolia.png", // optional
};

// setting up the auth
const privateKeyProvider = new EthereumPrivateKeyProvider({
  config: { chainConfig },
});

const web3Auth = new Web3Auth({
  clientId,
  // web3AuthNetwork: WEB3AUTH_NETWORK.TESTNET,
  web3AuthNetwork: "sapphire_devnet", // Matches the project network
  privateKeyProvider,
});

interface HeaderProps {
  onMenuClick: () => void;
  totalEarning: number;
}

const Header = ({ onMenuClick, totalEarning }: HeaderProps) => {
  const [provider, setProvider] = useState<IProvider | null>(null); // for the points mechanism (rewards)
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<Users | null>(null);
  const [notifications, setNotifications] = useState<Notifications[]>([]);
  const [balance, setBalance] = useState(0.0);

  const pathname = usePathname();

  const isMobile = useMediaQuery("(max-width: 768px)");

  // check if the user already loggedin
  useEffect(() => {
    const init = async () => {
      try {
        await web3Auth.initModal();
        setProvider(web3Auth.provider);

        if (web3Auth.connected) {
          setLoggedIn(true);
          const user = await web3Auth.getUserInfo();
          setUserInfo(user as Users);

          if (user.email) {
            localStorage.setItem("user", user.email);

            // create the user in the db
            try {
              await createUser(user.email, user.name || "Anonymous User");
            } catch (error) {
              console.error("Error creating User", error);
            }
          }
        }
      } catch (error) {
        console.error("Error initializing Web3Auth", error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // fetching user notification
  useEffect(() => {
    const fetchNotification = async () => {
      if (userInfo && userInfo.email) {
        const currentUser = await getUserByEmail(userInfo.email);

        if (currentUser) {
          const unreadNotification = await getUnreadNotification(
            currentUser.id
          );
          // @ts-ignore
          setNotifications(unreadNotification);
        }
      }
    };
    fetchNotification();

    const notificationInterval = setInterval(fetchNotification, 30000);

    return () => clearInterval(notificationInterval);
  }, [userInfo]);

  // fetching user balance
  useEffect(() => {
    const fetchUserBalance = async () => {
      if (userInfo && userInfo.email) {
        const currentUser = await getUserByEmail(userInfo.email);

        if (currentUser) {
          const userBalance = await getUserBalance(currentUser.id);
          setBalance(userBalance);
        }
      }
    };

    fetchUserBalance();

    const handleBalanceUpdate = (event: CustomEvent) => {
      setBalance(event.detail);
    };

    window.addEventListener(
      "balanceUpdate",
      handleBalanceUpdate as EventListener
    );

    return () =>
      window.removeEventListener(
        "balanceUpdate",
        handleBalanceUpdate as EventListener
      );
  }, [userInfo]);

  // login using web3 auth
  const login = async () => {
    if (!web3Auth) {
      console.error("Web3Auth is not initialized");
      return;
    }

    try {
      console.log("inside the login try catch");
      const web3authProvider = await web3Auth.connect();
      setProvider(web3Auth.provider);
      setLoggedIn(true);

      const user = await web3Auth.getUserInfo();

      if (user.email) {
        localStorage.setItem("user", user.email);
        setUserInfo(user as Users);

        // create the user in the db
        try {
          await createUser(user.email, user.name || "Anonymous User");
        } catch (error) {
          console.error("Error creating User (in Login)", error);
        }
      }
    } catch (error) {
      // @ts-ignore
      if (error.message === "User closed the modal") {
        console.warn("User closed the Web3Auth modal. Login process canceled.");
      } else {
        console.error("Error during Web3Auth login:", error);
      }
    }
  };

  // logout method using web3 auth
  const logout = async () => {
    if (!web3Auth) {
      console.error("Web3Auth is not initialized");
      return;
    }

    try {
      await web3Auth.logout();
      setProvider(null);
      setLoggedIn(false);
      setUserInfo(null);

      // remove the user from the localstorage
      localStorage.removeItem("userEmail");
    } catch (error) {
      console.error("Error in Loggin out (in Logout)", error);
    }
  };

  // user drop down info
  const getUserInfo = async () => {
    if (web3Auth.connected) {
      const user = await web3Auth.getUserInfo();
      setUserInfo(user as Users);

      if (user.email) {
        localStorage.setItem("userEmail", user.email);

        // create the user in the db
        try {
          await createUser(user.email, user.name || "Anonymous User");
        } catch (error) {
          console.error("Error creating User (in Login)", error);
        }
      }
    }
  };

  // mark the notification as read
  const handleNotificationClick = async (notificationId: number) => {
    await markNotificationAsRead(notificationId);
  };

  if (loading) {
    return <div>Loading Web3 auth</div>;
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 md:mr-4 text-gray-800"
            onClick={onMenuClick}
          >
            <Menu className="w-6 h-6" />
          </Button>
          <Link href="/" className="flex items-center">
            <Leaf className="h-6 w-6 md:h-8 md:w-8 text-green-500 mr-1 md:mr-2" />
            <span className="text-gray-800 font-bold text-base md:text-lg">
              GreenPoints
            </span>
          </Link>
        </div>
        {!isMobile && (
          <div className="flex-1 max-w-xl mx-4">
            <div className="relative ">
              <input
                type="text"
                placeholder="search..."
                className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <Search className="w-6 h-6 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        )}

        <div className="flex items-center">
          {isMobile && (
            <Button variant="ghost" size="icon" className="mr-2">
              <Search className="h-5 w-5" />
            </Button>
          )}

          {/* for notification */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2 relative">
                <Bell className="h-5 w-5 text-gray-800" />
                {notifications.length > 0 && (
                  <Badge className="absolute -top-1 px-1 -right-1 h-5 min-w-[1.2rem] rounded-full text-green-500 bg-white hover:bg-white hover:text-green-500">
                    {notifications.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification.id)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{notification.type}</span>
                      <span className="text-sm text-gray-500">
                        {notification.message}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem>No new notificatons</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* for balance */}
          <div className="bg-gray-100 flex items-center mr-2 md:mr-4 px-2 md:px-3 py-1 rounded-full ">
            <Coins className="w-4 h-4 md:h-5 md:w-5 mr-1 md:mr-2 text-green-500" />
            <span className="font-semibold text-sm md:text-base text-gray-800">
              {balance.toFixed(2)}
            </span>
          </div>

          {!loggedIn ? (
            <Button
              size="default"
              className="bg-green-600 hover:bg-green-700 text-white hover:text-white text-sm md:text-base"
              onClick={login}
            >
              Login{" "}
              <LogIn className="w-4 h-4 md:h-5 md:w-5 ml-1 md:ml-2 hover:text-white" />
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center">
                  <User className="w-5 h-5 mr-1" />
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  {userInfo ? userInfo.name : "Profile"}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  <div className="flex justify-between items-center w-full">
                    <span>Signout</span>
                    <LogOut className="w-4 h-4 ml-1" />
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
