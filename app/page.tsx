import {
  ArrowRight,
  Leaf,
  MapPin,
  Coins,
  Users,
  Recycle,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import FeatureCard from "@/components/FeatureCard";
import ImpactCard from "@/components/ImpactCard";

// Leaf animation (doing using divs like 4 divs)
const AnimatedLeaf = () => {
  return (
    <div className="relative mx-auto w-32 h-32 mb-8">
      <div className="absolute inset-0 bg-green-500 rounded-full opacity-20 animate-pulse"></div>
      <div className="absolute inset-2 bg-green-400 rounded-full opacity-40 animate-ping"></div>
      <div className="absolute inset-4 bg-green-300 rounded-full opacity-60 animate-spin"></div>
      <div className="absolute inset-6 bg-green-200 rounded-full opacity-80 animate-bounce"></div>
      <Leaf className="absolute inset-0 m-auto h-16 w-16 text-green-600 animate-pulse" />
    </div>
  );
};

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-16">
      <section className="text-center mb-20">
        <AnimatedLeaf />
        <h1 className="text-6xl font-bold mb-6 text-gray-800 tracking-tight">
          GreenPoints <span className="text-green-600">Waste Management</span>
        </h1>
        <p className="text-gray-600 text-xl max-w-2xl mx-auto leading-relaxed mb-8">
          Join our community in making waste management more efficient and
          rewarding!
        </p>
        <Button className="bg-green-600 hover:bg-green-700 text-white rounded-full text-lg px-10">
          Report Waste
        </Button>
      </section>

      <section className="grid md:grid-cols-3 gap-10 mb-20 ">
        <FeatureCard
          icon={Leaf}
          title="Eco Friendly"
          description="Our mission is to create a greener future by reducing waste and encouraging sustainable practices."
        />
        <FeatureCard
          icon={Coins}
          title="Earn Rewards"
          description="Get rewarded for making eco-conscious choices and supporting sustainable initiatives."
        />
        <FeatureCard
          icon={Users}
          title="Community Driven"
          description="Join a passionate community working together to make a positive environmental impact."
        />
      </section>

      <section className="bg-white rounded-3xl p-10 shadow-lg mb-20">
        <h2 className="text-4xl font-bold mb-12 text-center text-gray-800 ">
          Our Impact
        </h2>

        <div className="grid md:grid-cols-4 gap-6">
          <ImpactCard title="Waste Collected" value="350 kg" icon={Recycle} />
          <ImpactCard title="Reports Submitted" value="4" icon={MapPin} />
          <ImpactCard title="Points Earned" value="0" icon={Coins} />
          <ImpactCard title="CO2 Offset" value="175 kg" icon={Leaf} />
        </div>
      </section>
    </div>
  );
}
