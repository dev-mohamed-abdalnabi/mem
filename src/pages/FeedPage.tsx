import React from 'react';
import { Target, MessageSquare, TrendingUp, Star, Award, Save } from 'lucide-react'; // استيراد الأيقونات

const MemeCard = () => {
  // --- بيانات المستخدم Placeholder (يمكن استبدالها ببيانات حقيقية من الـ API) ---
  const user = {
    username: 'devx',
    points: 87,
    followers: 4,
    avatar: 'https://cdn4.vectorstock.com/i/1000x1000/01/33/gamer-esports-logo-design-template-design-vector-30750133.jpg' // صورة رمزية placeholder
  };

  // --- بيانات الأباطرة Placeholder (يمكن استبدالها ببيانات حقيقية من الـ API) ---
  const emperors = [
    { username: 'devx', points: 92, rank: 1 },
    { username: 'محمد', points: 30, rank: 2 },
  ];

  // --- مصفوفة دليل النقاط ---
  const pointsGuide = [
    { icon: <Target className="w-6 h-6 text-indigo-400" />, points: '5+', description: 'لكل ميمز' },
    { icon: <MessageSquare className="w-6 h-6 text-green-400" />, points: '2+', description: 'لكل تعليق' },
    { icon: <TrendingUp className="w-6 h-6 text-yellow-400" />, points: '10+', description: 'لتفاعل جديد' },
    { icon: <Star className="w-6 h-6 text-amber-400" />, points: '1500+', description: 'مستوى الأباطرة' },
  ];

  return (
    <div className="mx-4 md:mx-6 my-4"> {/* --- حل مشكلة الالتصاق على المحمول --- */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row rtl"> {/* --- تصميم AI داكن ومحسن --- */}
        
        {/* --- ملف المستخدم على اليمين (على المحمول، يظهر فوق الميمز) --- */}
        <div className="md:w-1/4 bg-slate-900 p-6 flex flex-col items-center border-b md:border-r border-slate-800">
          <img
            src={user.avatar}
            alt="User Avatar"
            className="w-24 h-24 rounded-full border-4 border-slate-700 shadow-md mb-4"
          />
          <h2 className="text-xl font-bold text-slate-100">{user.username}</h2>
          <button className="text-sm text-blue-400 mt-1 hover:underline">عرض الإعدادات</button>
          
          <div className="flex justify-between w-full mt-6 text-center text-slate-400 border-t border-slate-700 pt-4">
            <div>
              <p className="text-3xl font-extrabold text-slate-100">{user.points}</p>
              <p className="text-xs">نقطة</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slate-100">{user.followers}</p>
              <p className="text-xs">متابع</p>
            </div>
          </div>
        </div>

        {/* --- محتوى الميمز الرئيسي --- */}
        <div className="flex-1 flex flex-col">
          
          {/* --- عنوان لوحة الشرف مع التدرج الأرجواني --- */}
          <div className="p-6 text-center bg-gradient-to-r from-purple-800 via-purple-900 to-indigo-900 border-b border-slate-800">
            <h1 className="text-2xl font-bold text-white mb-2 leading-tight">
              نخبة صناع البهجة والضحك
              <br />
              <span className="text-3xl font-extrabold">لوحة شرف الأباطرة والرواد</span>
            </h1>
            <p className="text-purple-100 text-sm">
              أهلاً بكم في قمة عالم الميمز، حيث يُتوج الإبداع والكوميديا الحقيقية.
            </p>
          </div>

          {/* --- دليل مستويات الأرباح والنقاط (مبسط وأنيق) --- */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4 border-r-4 border-indigo-500 pr-3">دليل مستويات الأرباح والنقاط</h3>
            <div className="grid grid-cols-2 gap-4">
              {pointsGuide.map((item, index) => (
                <div key={index} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center space-x-3 rtl:space-x-reverse transition-transform hover:scale-105">
                  <div className="bg-slate-800 p-2 rounded-full">{item.icon}</div>
                  <div>
                    <p className="text-lg font-bold text-slate-100">{item.points}</p>
                    <p className="text-xs text-slate-400">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* --- سجل التتويج التاريخي للأباطرة (مبسط) --- */}
          <div className="px-6 pb-6 mt-auto">
            <h3 className="text-lg font-semibold text-slate-100 mb-4 border-r-4 border-amber-500 pr-3">سجل التتويج التاريخي (أبرز الأباطرة)</h3>
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              {emperors.map((emp, index) => (
                <div key={index} className={`flex items-center space-x-2 rtl:space-x-reverse ${emp.rank === 1 ? 'bg-slate-800 p-2 rounded-lg' : ''}`}>
                  <img
                    src={`https://api.dicebear.com/8.x/initials/svg?seed=${emp.username}`}
                    alt="Emperor Avatar"
                    className="w-10 h-10 rounded-full border border-slate-700"
                  />
                  <div>
                    <p className={`font-semibold ${emp.rank === 1 ? 'text-amber-300' : 'text-slate-300'}`}>{emp.username}</p>
                    <p className="text-xs text-slate-400">{emp.points} نقاط</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* --- الواجهة السفلية للأيقونات (Navigation Bar) --- */}
          <div className="bg-slate-900 p-4 border-t border-slate-800 flex justify-around text-slate-500">
            {[Award, Save, TrendingUp].map((Icon, index) => (
              <button key={index} className="hover:text-slate-100 transition-colors">
                <Icon className="w-7 h-7" />
              </button>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
};

export default MemeCard;
