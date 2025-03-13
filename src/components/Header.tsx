
import { Button } from "@/components/ui/button";

export const Header = () => (
  <header className="border-b bg-white/80 backdrop-blur-sm fixed top-0 w-full z-50">
    <div className="max-w-7xl mx-auto px-4 flex items-center justify-between py-px">
      <div className="flex items-center">
        <img src="/lovable-uploads/c043db32-f19c-4f34-8153-6fbc96dab40a.png" alt="Notion Capital" className="h-[84px] mr-2 rounded-lg" />
        <span className="text-lg font-medium text-gray-900"></span>
      </div>
      <nav className="space-x-6">
        <Button 
          variant="ghost" 
          className="text-gray-700 hover:text-gray-900"
          onClick={() => window.open('https://www.notion.vc/platform', '_blank')}
        >
          Platform
        </Button>
        <Button 
          variant="ghost" 
          className="text-gray-700 hover:text-gray-900"
          onClick={() => window.open('https://www.notion.vc/portfolio', '_blank')}
        >
          Portfolio
        </Button>
        <Button 
          variant="ghost" 
          className="text-gray-700 hover:text-gray-900"
          onClick={() => window.open('https://www.notion.vc/why-notion', '_blank')}
        >
          About
        </Button>
      </nav>
    </div>
  </header>
);
