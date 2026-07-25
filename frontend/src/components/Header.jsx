import React from 'react';
import { Search, Globe, ShieldCheck, RefreshCw, LogOut, UserCheck, Users } from 'lucide-react';
import { AFRICAN_LOCATIONS } from '../data/africanLocations';
import { useAuth } from '../context/AuthContext';

export default function Header({
  selectedCountry,
  setSelectedCountry,
  selectedState,
  setSelectedState,
  activeRole,
  setActiveRole,
  onRefresh,
  onOpenTeamModal
}) {
  const { user, logoutUser, switchDemoRole } = useAuth();
  const currentCountry = AFRICAN_LOCATIONS.find(c => c.country === selectedCountry) || AFRICAN_LOCATIONS[0];

  const handleRoleSelectChange = (newRole) => {
    setActiveRole(newRole);
    if (switchDemoRole) {
      switchDemoRole(newRole, user?.email, user?.full_name);
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-slate-900/75 backdrop-blur-xl border-b border-slate-800/80 px-5 py-3 flex items-center justify-between gap-4 shrink-0">

      {/* Search Bar */}
      <div className="relative w-64 shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Search orders, customers, phone..."
          className="input pl-9 py-1.5 text-xs"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 flex-wrap justify-end">

        {/* Country Selector */}
        <div className="flex items-center gap-1.5 glass px-3 py-1.5 rounded-xl text-xs">
          <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <select
            value={selectedCountry}
            onChange={e => { setSelectedCountry(e.target.value); setSelectedState('All Regions'); }}
            className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-medium text-xs"
          >
            {AFRICAN_LOCATIONS.map(loc => (
              <option key={loc.code} value={loc.country} className="bg-slate-900">
                {loc.country} ({loc.currency})
              </option>
            ))}
          </select>
        </div>

        {/* State/Region */}
        <div className="flex items-center gap-1.5 glass px-3 py-1.5 rounded-xl text-xs">
          <span className="text-slate-500 font-medium shrink-0">Region</span>
          <select
            value={selectedState}
            onChange={e => setSelectedState(e.target.value)}
            className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-medium text-xs max-w-[120px]"
          >
            <option value="All Regions" className="bg-slate-900">All Regions</option>
            {currentCountry.states.map(st => (
              <option key={st} value={st} className="bg-slate-900">{st}</option>
            ))}
          </select>
        </div>

        {/* Team Accounts Button (Owner & Admin only) */}
        {['owner', 'admin'].includes(user?.role) && (
          <button
            onClick={onOpenTeamModal}
            title="Manage Staff Accounts"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass text-indigo-300 hover:text-white hover:bg-indigo-600/30 text-xs font-bold transition-all border border-indigo-500/20"
          >
            <Users className="w-3.5 h-3.5 text-indigo-400" /> Team Accounts
          </button>
        )}

        {/* Role Switcher (Owner only) */}
        {user?.role === 'owner' && (
          <div className="flex items-center gap-1.5 glass px-3 py-1.5 rounded-xl text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <select
              value={activeRole}
              onChange={e => handleRoleSelectChange(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-medium text-xs"
            >
              <option value="owner" className="bg-slate-900">Owner / Admin</option>
              <option value="confirmation_staff" className="bg-slate-900">Confirmation Staff</option>
              <option value="logistics" className="bg-slate-900">Logistics Rider</option>
            </select>
          </div>
        )}

        {/* Refresh */}
        <button
          onClick={onRefresh}
          title="Refresh data"
          className="p-2 rounded-xl glass text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Logout Button */}
        {user && (
          <button
            onClick={logoutUser}
            title="Sign Out"
            className="p-2 rounded-xl glass text-rose-400 hover:bg-rose-500/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
