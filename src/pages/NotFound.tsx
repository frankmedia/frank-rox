import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-yellow-500">404</h1>
        <p className="mb-4 text-xl text-zinc-400">Oops! Page not found</p>
        <Link to="/" className="text-yellow-500 hover:text-yellow-400 underline transition-colors">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
