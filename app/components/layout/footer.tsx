export function Footer() {
  return (
    <footer className="border-t bg-white py-4">
      <div className="container mx-auto px-4 text-center text-sm text-slate-500">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div>
            &copy; {new Date().getFullYear()} ALX Polly. All rights reserved.
          </div>
          <div className="flex space-x-4 mt-2 md:mt-0">
            <a href="#" className="hover:text-slate-800">Privacy Policy</a>
            <a href="#" className="hover:text-slate-800">Terms of Service</a>
            <a href="#" className="hover:text-slate-800">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}