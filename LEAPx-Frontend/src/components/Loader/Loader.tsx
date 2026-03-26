import { Loader2 } from 'lucide-react';

const Loader = () => {
  return (
    <div className='bg-white w-full min-h-screen items-center justify-center flex flex-col'>
      <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
                    <p className="text-gray-600">รอแป๊บนึงนะ กำลังเตรียมหน้าเว็บ .....</p>
                </div>
            </div>
    
    </div>
  );
}
export default Loader;