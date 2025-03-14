
import React from "react";
import SearchInput from "@/components/SearchInput";
import { useToast } from "@/components/ui/use-toast";
import LogoutButton from "@/components/LogoutButton";

const Index = () => {
  const { toast } = useToast();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Assistant Explorer</h1>
        <LogoutButton />
      </div>
      
      <div className="max-w-3xl mx-auto">
        <SearchInput />
      </div>
    </div>
  );
};

export default Index;
