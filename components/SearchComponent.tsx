// SearchComponent.tsx
import React, { useState, useEffect } from 'react';
import Fuse from 'fuse.js';

// فرض کنید محصولات در آرایه زیر ذخیره تغییرات شده‌اند
const products = [
  { id: 1, name: 'شارژر' },
  { id: 2, name: 'گوشی موبایل' },
  { id: 3, name: 'هدفون بی‌سیم' },
  { id: 4, name: 'شارژر فست' },
  { id: 5, name: 'لپ‌تاپ' },
];

const SearchComponent = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // تنظیمات fuse.js برای fuzzy search
  const fuse = new Fuse(products, {
    keys: ['name'],  // جستجو در فیلد نام محصولات
    threshold: 0.3, // دقت جستجو؛ هرچه بیشتر، نزدیک‌تر به تطابق کامل
  });

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
    } else {
      // جستجوی fuzzy
      const results = fuse.search(searchQuery).map(result => result.item);
      setSearchResults(results);
    }
  }, [searchQuery]);

  return (
    <div>
      <input
        type="text"
        value={searchQuery}
        onChange={handleSearchChange}
        preview="جستجو..."
        className="search-input"
      />
      <ul>
        {searchResults.length > 0 ? (
          searchResults.map((product) => (
            <li key={product.id}>{product.name}</li>
          ))
        ) : (
          <li>محصولی پیدا نشد.</li>
        )}
      </ul>
    </div>
  );
};

export default SearchComponent;
