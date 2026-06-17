import React, { useMemo } from 'react';
import { Member } from '../../types';
import { Cake, Sparkles, Gift, Send, Calendar, Phone, Mail } from 'lucide-react';

interface BirthdayViewProps {
  members: Member[];
}

export default function BirthdayView({ members }: BirthdayViewProps) {
  // Birthday calculations
  const birthdayReminders = useMemo(() => {
    const todayStr = '2026-06-17'; // Keep aligned relative to metadata local time
    const today = new Date(todayStr);
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    return members.map(m => {
      if (!m.birthday) return null;

      const birthParts = m.birthday.split('-');
      const birthMonth = parseInt(birthParts[1]);
      const birthDay = parseInt(birthParts[2]);

      // Calculate days remaining
      let targetYear = today.getFullYear();
      let targetBirthday = new Date(targetYear, birthMonth - 1, birthDay);

      // If already passed this year, look at next year
      if (targetBirthday < today && !(birthMonth === todayMonth && birthDay === todayDay)) {
        targetYear += 1;
        targetBirthday = new Date(targetYear, birthMonth - 1, birthDay);
      }

      const diffTime = targetBirthday.getTime() - today.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      const isToday = birthMonth === todayMonth && birthDay === todayDay;

      return {
        memberId: m.id,
        fullName: m.fullName,
        birthday: m.birthday,
        phoneNumber: m.phoneNumber,
        email: m.email || '',
        daysRemaining: isToday ? 0 : daysRemaining,
        isToday,
        monthDayStr: `${targetBirthday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
      };
    })
    .filter(Boolean)
    // Sort so today's is first, then upcoming soonest
    .sort((a, b) => {
      if (a!.isToday) return -1;
      if (b!.isToday) return 1;
      return a!.daysRemaining - b!.daysRemaining;
    }) as any[];
  }, [members]);

  // Separate today vs upcoming
  const todayBirthdays = useMemo(() => {
    return birthdayReminders.filter(b => b.isToday);
  }, [birthdayReminders]);

  const upcomingBirthdays = useMemo(() => {
    return birthdayReminders.filter(b => !b.isToday);
  }, [birthdayReminders]);

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-150 tracking-tight font-sans">Fellowship Birthday Celebrations</h1>
        <p className="text-xs text-gray-500 font-medium">Celebrate, call, and send greetings to our members on their special anniversaries.</p>
      </div>

      {/* HIGHLIGHT TODAY'S BIRTHDAYS */}
      {todayBirthdays.length > 0 && (
        <div className="bg-linear-to-r from-blue-600 to-indigo-700 text-white p-6 sm:p-8 rounded-3xl border border-blue-500 shadow-lg relative overflow-hidden space-y-4">
          <div className="absolute right-0 top-0 opacity-10 transform translate-x-6 -translate-y-6">
            <Cake className="w-64 h-64" />
          </div>

          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-300 animate-spin" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200">Happening Today!</span>
          </div>

          <div className="space-y-3 relative z-10">
            <h2 className="text-2xl font-bold font-sans">Celebrating Born Today 🎉</h2>
            <p className="text-xs text-blue-100 leading-relaxed max-w-md">
              Send them a customized congratulatory card, WhatsApp reminder, or give them a celebratory outreach call today!
            </p>
          </div>

          {/* Cards of today's birthdays */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10 pt-2">
            {todayBirthdays.map(b => (
              <div key={b.memberId} className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-base leading-snug">{b.fullName}</h4>
                  <p className="text-xs text-blue-200 mt-1 flex items-center">
                    <Gift className="w-4.5 h-4.5 mr-1 text-amber-300" />
                    BBD: {b.birthday}
                  </p>
                </div>
                {/* Contact triggers */}
                <div className="flex space-x-2">
                  <a
                    href={`tel:${b.phoneNumber}`}
                    className="p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all border border-white/10"
                    title="Call Member"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <a
                    href={`mailto:${b.email}`}
                    className="p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all border border-white/10"
                    title="Email Member"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* UPCOMING CELEBRATIONS */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
        <div className="border-b border-gray-100 pb-3.5 flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <h3 className="text-sm font-bold text-slate-800">Upcoming Birthdays Board</h3>
        </div>

        {upcomingBirthdays.length === 0 ? (
          <p className="text-slate-400 text-xs py-4 text-center">No other birthdays registered in the system.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingBirthdays.map(b => (
              <div
                key={b.memberId}
                className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-white hover:border-blue-200 hover:shadow-2xs transition-all"
              >
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm leading-tight">{b.fullName}</h4>
                  <div className="flex items-center text-[10px] text-gray-450 leading-none space-x-2 font-mono">
                    <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md font-sans">{b.monthDayStr}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="block text-xs font-bold text-blue-600">{b.daysRemaining} days</span>
                  <span className="block text-[9px] text-gray-400 uppercase font-mono font-bold">Remaining</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
