import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

interface LoginFormProps {
  onLogin: (email: string, password: string) => void;
  isLoading: boolean;
  error: string | null;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, isLoading, error }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Simple validation
    if (!email.trim() || !password.trim()) {
      setFormError("Please enter both email and password");
      return;
    }

    if (!email.includes("@")) {
      setFormError("Please enter a valid email address");
      return;
    }

    // Clear any form error
    setFormError(null);

    // Pass credentials to parent component
    onLogin(email, password);
  };

  return (
    <div className="max-w-md mx-auto space-y-4 sm:space-y-6 px-1 sm:px-0">
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">
          TrainHeroic Login
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          Enter your TrainHeroic credentials to access your workout data
        </p>
      </div>

      {(error || formError) && (
        <Alert variant="destructive">
          <AlertDescription className="text-sm">
            {error || formError}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div className="space-y-1 sm:space-y-2">
          <label
            htmlFor="email"
            className="block text-xs sm:text-sm font-medium"
          >
            Email
          </label>
          <Input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            disabled={isLoading}
            required
            className="text-sm sm:text-base h-9 sm:h-10"
          />
        </div>

        <div className="space-y-1 sm:space-y-2">
          <label
            htmlFor="password"
            className="block text-xs sm:text-sm font-medium"
          >
            Password
          </label>
          <Input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
            className="text-sm sm:text-base h-9 sm:h-10"
          />
        </div>

        <Button
          type="submit"
          className="w-full mt-2"
          disabled={isLoading}
          size="sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Login"
          )}
        </Button>
      </form>
    </div>
  );
};

export default LoginForm;
