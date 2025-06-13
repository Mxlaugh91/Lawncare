import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Grab as Grass } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
          <Grass className="h-8 w-8 text-green-700" />
        </div>
        
        <h1 className="text-3xl font-bold">Side ikke funnet</h1>
        <p className="text-gray-600">
          Beklager, men siden du leter etter eksisterer ikke.
        </p>
        
        <div className="pt-4">
          <Button asChild>
            <Link to="/">Gå til forsiden</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;