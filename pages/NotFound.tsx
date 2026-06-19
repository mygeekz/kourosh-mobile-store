
import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-white rounded-xl shadow-sm p-6 text-center">
      <i className="fa-solid fa-triangle-exclamation text-6xl text-yellow-500 mb-6"></i>
      <h1 className="text-4xl font-bold text-gray-800 mb-2">۴۰۴ - صفحه مورد نظر یافت نشد</h1>
      <p className="text-gray-600 mb-6">اوپس! صفحه‌ای که به دنبال آن هستید وجود ندارد.</p>
      <Link 
        to="/"
        className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
      >
        بازگشت به داشبورد
      </Link>
    </div>
  );
};

export default NotFound;
