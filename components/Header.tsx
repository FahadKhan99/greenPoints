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
  Coffee,
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
} from "@/utils/db/actions";

// import {useMediaQuery} from "./create this "

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
  // @ts-ignore
  config: chainConfig,
});

const web3Auth = new Web3Auth({
  clientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.TESTNET,
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
  const [userInfo, setUserInfo] = useState<any>(null);
  const [notification, setNotification] = useState<Notification[]>([]);
  const [balance, setBalance] = useState(0);

  const pathname = usePathname();

  useEffect(() => {
    const init = async () => {
      try {
        await web3Auth.initModal();
        setProvider(web3Auth.provider);

        if (web3Auth.connected) {
          setLoggedIn(true);
          const user = await web3Auth.getUserInfo();
          setUserInfo(user);

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
          // @ts-ignore   // big error
          setNotification(unreadNotification);
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
      const web3authProvider = await web3Auth.connect();
      setProvider(web3Auth.provider);
      setLoggedIn(true);

      const user = await web3Auth.getUserInfo();

      if (user.email) {
        localStorage.setItem("user", user.email);

        // create the user in the db
        try {
          await createUser(user.email, user.name || "Anonymous User");
        } catch (error) {
          console.error("Error creating User (in Login)", error);
        }
      }
    } catch (error) {
      console.error("Error logging in", error);
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

  return <div></div>;
};

export default Header;
