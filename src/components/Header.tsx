
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Header = () => {
  const { user, signOut } = useAuth();

  // Create initials from user email for avatar fallback
  const getInitials = () => {
    if (!user?.email) return "U";
    return user.email.substring(0, 2).toUpperCase();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/80 border-b transition-all">
      <div className="w-full max-w-[1600px] mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center">
          <img 
            src="/lovable-uploads/8440a119-0b53-46c9-a6c7-4bcef311d38f.png" 
            alt="Notion" 
            className="w-24 h-auto object-cover"
          />
        </Link>
        
        <div className="flex items-center gap-8">
          <nav className="hidden md:flex items-center gap-8">
            <a href="https://www.notion.vc/platform" className="text-sm font-medium hover:text-gray-600 transition-colors">
              Platform
            </a>
            <a href="https://www.notion.vc/portfolio" className="text-sm font-medium hover:text-gray-600 transition-colors">
              Portfolio
            </a>
            <a href="https://www.notion.vc/why-notion" className="text-sm font-medium hover:text-gray-600 transition-colors">
              About
            </a>
          </nav>
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || ""} />
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>My Account</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth">
              <Button variant="default">Log in</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
