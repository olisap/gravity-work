import React, { useState, useEffect } from 'react';
import { Settings, Save, History, Check, AlertTriangle, ShieldCheck, Bell, Building, ToggleLeft, ToggleRight, Upload } from 'lucide-react';
import { AFRICAN_LOCATIONS } from '../data/africanLocations';
import { useAuth } from '../context/AuthContext';
import AuditTrailModal from '../components/AuditTrailModal';

export default function SettingsPage({ onSettingsUpdated }) {
  const { user } = useAuth();
  const [showAuditTrailModal, setShowAuditTrailModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 1. Store Profile State
  const [storeName, setStoreName] = useState(user?.store_name || 'olistores');
  const [companyLogo, setCompanyLogo] = useState('/logo.png');
  const [storeCountry, setStoreCountry] = useState('Nigeria');
  const [officeState, setOfficeState] = useState('Lagos');
  const [warehouseState, setWarehouseState] = useState('Lagos');
  const [storeAddress, setStoreAddress] = useState('LAGOS');
  const [phoneNumber, setPhoneNumber] = useState('2349068609892');
  const [whatsappNumber, setWhatsappNumber] = useState('2349068609892');
  const [email, setEmail] = useState(user?.email || 'olisapaul1@gmail.com');
  const [invoiceFooterMessage, setInvoiceFooterMessage] = useState('eg: Grand Total Includes 7.5% VAT');

  // 2. Optional Tabs State
  const [tabConfirmed, setTabConfirmed] = useState(true);
  const [tabShipped, setTabShipped] = useState(true);
  const [tabReturned, setTabReturned] = useState(true);
  const [tabAfterSale, setTabAfterSale] = useState(true);
  const [tabFailed, setTabFailed] = useState(true);

  // 3. Security & Notifications State
  const [emailOnLogin, setEmailOnLogin] = useState(true);
  const [showPerformanceBar, setShowPerformanceBar] = useState(true);
  const [forceDeliveredQtySelection, setForceDeliveredQtySelection] = useState(false);

  const [lowStockSms, setLowStockSms] = useState(false);
  const [lowStockEmail, setLowStockEmail] = useState(true);
  const [lowStockWhatsapp, setLowStockWhatsapp] = useState(true);

  const [reminderEmail, setReminderEmail] = useState(true);
  const [reminderWhatsapp, setReminderWhatsapp] = useState(true);

  const [invoiceViaEmail, setInvoiceViaEmail] = useState(true);
  const [invoiceViaWhatsapp, setInvoiceViaWhatsapp] = useState(true);

  // 4. Dispatch & Inventory Rules State
  const [preventDuplicateOrders, setPreventDuplicateOrders] = useState(true);
  const [whatsappNotifyAgents, setWhatsappNotifyAgents] = useState(true);
  const [selectCloserOnDelivered, setSelectCloserOnDelivered] = useState(false);
  const [stateSelectionOption, setStateSelectionOption] = useState('Select State');
  const [manageInventory, setManageInventory] = useState(true);
  const [roundRobinAssignment, setRoundRobinAssignment] = useState('No');

  const currentCountryObj = AFRICAN_LOCATIONS.find(c => c.country === storeCountry) || AFRICAN_LOCATIONS[0];

  // Fetch initial settings from server
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const storeId = user?.store_id || user?.id || '';
        const token = localStorage.getItem('gravity_crm_token');
        const res = await fetch(`/api/settings?store_id=${encodeURIComponent(storeId)}`, {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        const data = await res.json();
        if (data) {
          if (data.store_name) setStoreName(data.store_name);
          if (data.company_logo) setCompanyLogo(data.company_logo);
          if (data.store_country) setStoreCountry(data.store_country);
          if (data.office_state) setOfficeState(data.office_state);
          if (data.warehouse_state) setWarehouseState(data.warehouse_state);
          if (data.store_address) setStoreAddress(data.store_address);
          if (data.phone_number) setPhoneNumber(data.phone_number);
          if (data.whatsapp_number) setWhatsappNumber(data.whatsapp_number);
          if (data.email) setEmail(data.email);
          if (data.invoice_footer_message) setInvoiceFooterMessage(data.invoice_footer_message);

          if (data.tab_confirmed !== undefined) setTabConfirmed(data.tab_confirmed);
          if (data.tab_shipped !== undefined) setTabShipped(data.tab_shipped);
          if (data.tab_returned !== undefined) setTabReturned(data.tab_returned);
          if (data.tab_after_sale !== undefined) setTabAfterSale(data.tab_after_sale);
          if (data.tab_failed !== undefined) setTabFailed(data.tab_failed);

          if (data.email_on_login !== undefined) setEmailOnLogin(data.email_on_login);
          if (data.show_performance_bar !== undefined) setShowPerformanceBar(data.show_performance_bar);
          if (data.force_delivered_qty_selection !== undefined) setForceDeliveredQtySelection(data.force_delivered_qty_selection);

          if (data.low_stock_sms !== undefined) setLowStockSms(data.low_stock_sms);
          if (data.low_stock_email !== undefined) setLowStockEmail(data.low_stock_email);
          if (data.low_stock_whatsapp !== undefined) setLowStockWhatsapp(data.low_stock_whatsapp);

          if (data.reminder_email !== undefined) setReminderEmail(data.reminder_email);
          if (data.reminder_whatsapp !== undefined) setReminderWhatsapp(data.reminder_whatsapp);

          if (data.invoice_via_email !== undefined) setInvoiceViaEmail(data.invoice_via_email);
          if (data.invoice_via_whatsapp !== undefined) setInvoiceViaWhatsapp(data.invoice_via_whatsapp);

          if (data.prevent_duplicate_orders !== undefined) setPreventDuplicateOrders(data.prevent_duplicate_orders);
          if (data.whatsapp_notify_agents !== undefined) setWhatsappNotifyAgents(data.whatsapp_notify_agents);
          if (data.select_closer_on_delivered !== undefined) setSelectCloserOnDelivered(data.select_closer_on_delivered);
          if (data.state_selection_option) setStateSelectionOption(data.state_selection_option);
          if (data.manage_inventory !== undefined) setManageInventory(data.manage_inventory);
          if (data.round_robin_assignment) setRoundRobinAssignment(data.round_robin_assignment);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };

    fetchSettings();
  }, [user]);

  // Save Settings Form Handler
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    const payload = {
      store_id: user?.store_id || user?.id,
      store_name: storeName,
      company_logo: companyLogo,
      store_country: storeCountry,
      office_state: officeState,
      warehouse_state: warehouseState,
      store_address: storeAddress,
      phone_number: phoneNumber,
      whatsapp_number: whatsappNumber,
      email,
      invoice_footer_message: invoiceFooterMessage,

      tab_confirmed: tabConfirmed,
      tab_shipped: tabShipped,
      tab_returned: tabReturned,
      tab_after_sale: tabAfterSale,
      tab_failed: tabFailed,

      email_on_login: emailOnLogin,
      show_performance_bar: showPerformanceBar,
      force_delivered_qty_selection: forceDeliveredQtySelection,
      low_stock_sms: lowStockSms,
      low_stock_email: lowStockEmail,
      low_stock_whatsapp: lowStockWhatsapp,
      reminder_email: reminderEmail,
      reminder_whatsapp: reminderWhatsapp,
      invoice_via_email: invoiceViaEmail,
      invoice_via_whatsapp: invoiceViaWhatsapp,

      prevent_duplicate_orders: preventDuplicateOrders,
      whatsapp_notify_agents: whatsappNotifyAgents,
      select_closer_on_delivered: selectCloserOnDelivered,
      state_selection_option: stateSelectionOption,
      manage_inventory: manageInventory,
      round_robin_assignment: roundRobinAssignment
    };

    try {
      const token = localStorage.getItem('gravity_crm_token');
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setSaveSuccess(true);
        if (onSettingsUpdated) onSettingsUpdated(data.settings);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  // Custom Toggle Switch Component
  const Toggle = ({ enabled, onChange, label, subtext }) => (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-semibold text-slate-300">
        {label}
        {subtext && <span className="block text-[10px] text-slate-400 font-normal">{subtext}</span>}
      </span>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className="shrink-0 focus:outline-none"
      >
        {enabled ? (
          <ToggleRight className="w-8 h-8 text-indigo-500 transition-colors" />
        ) : (
          <ToggleLeft className="w-8 h-8 text-slate-600 transition-colors" />
        )}
      </button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" /> Store & Portal Settings
          </h2>
          <p className="text-xs text-slate-400">
            Configure your merchant store preferences, order pipeline tabs, notification channels, and inventory rules
          </p>
        </div>
        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/30">
            <Check className="w-4 h-4" /> Settings Saved!
          </div>
        )}
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        
        {/* ── SECTION 1: STORE PROFILE & BUSINESS DETAILS ── */}
        <div className="glass p-6 rounded-2xl border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800/80 pb-2">
            <Building className="w-4 h-4" /> Store & Merchant Profile Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">STORE NAME *</label>
              <input
                type="text"
                required
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                className="input text-xs"
                placeholder="olistores"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">COMPANY LOGO</label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
                  <img src={companyLogo} alt="Logo" className="w-full h-full object-contain p-1" onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/40?text=LOGO'; }} />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newLogo = prompt('Enter Image URL for Company Logo:', companyLogo);
                    if (newLogo) setCompanyLogo(newLogo);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow"
                >
                  <Upload className="w-3.5 h-3.5" /> COMPANY LOGO
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">STORE COUNTRY *</label>
              <select
                value={storeCountry}
                onChange={e => setStoreCountry(e.target.value)}
                className="select text-xs"
              >
                {AFRICAN_LOCATIONS.map(loc => (
                  <option key={loc.code} value={loc.country} className="bg-slate-900">
                    {loc.country} ({loc.currency})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">OFFICE STATE/REGION</label>
                <select
                  value={officeState}
                  onChange={e => setOfficeState(e.target.value)}
                  className="select text-xs"
                >
                  {currentCountryObj.states.map(st => (
                    <option key={st} value={st} className="bg-slate-900">{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">WARE-HOUSE STATE/REGION (IF ANY)</label>
                <select
                  value={warehouseState}
                  onChange={e => setWarehouseState(e.target.value)}
                  className="select text-xs"
                >
                  {currentCountryObj.states.map(st => (
                    <option key={st} value={st} className="bg-slate-900">{st}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-300 block mb-1">STORE ADDRESS *</label>
              <input
                type="text"
                required
                value={storeAddress}
                onChange={e => setStoreAddress(e.target.value)}
                className="input text-xs"
                placeholder="LAGOS"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">PHONE NUMBER *</label>
              <input
                type="text"
                required
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                className="input text-xs font-mono"
                placeholder="2349068609892"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">WHATSAPP NUMBER *</label>
              <input
                type="text"
                required
                value={whatsappNumber}
                onChange={e => setWhatsappNumber(e.target.value)}
                className="input text-xs font-mono"
                placeholder="2349068609892"
              />
              <p className="text-[9px] text-slate-400 mt-1 leading-tight uppercase font-semibold">
                (MAKE SURE YOU ADD YOUR COUNTRY CODE, WITHOUT THE + SIGN AND WITHOUT THE FIRST ZERO OF YOUR PHONE NUMBER. EXAMPLE: 2348012345678 WHERE 234 IS THE COUNTRY CODE)
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-300 block mb-1">EMAIL *</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input text-xs"
                placeholder="olisapaul1@gmail.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-300 block mb-1">INVOICE FOOTER MESSAGE</label>
              <input
                type="text"
                value={invoiceFooterMessage}
                onChange={e => setInvoiceFooterMessage(e.target.value)}
                className="input text-xs"
                placeholder="eg: Grand Total includes 7.5% VAT"
              />
            </div>
          </div>
        </div>

        {/* ── SECTION 2: OPTIONAL TABS TO SHOW ON ORDERS PAGE ── */}
        <div className="glass p-6 rounded-2xl border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider border-b border-slate-800/80 pb-2">
            OPTIONAL TABS TO SHOW ON ORDERS PAGE
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Toggle enabled={tabConfirmed} onChange={setTabConfirmed} label="Confirmed Orders Tab" />
            <Toggle enabled={tabShipped} onChange={setTabShipped} label="Shipped Orders Tab" />
            <Toggle enabled={tabReturned} onChange={setTabReturned} label="Returned Orders Tab" />
            <Toggle enabled={tabAfterSale} onChange={setTabAfterSale} label="After-Sale Call Tab" />
            <Toggle enabled={tabFailed} onChange={setTabFailed} label="Failed Orders Tab" />
          </div>
        </div>

        {/* ── SECTION 3: SECURITY & NOTIFICATION PREFERENCES ── */}
        <div className="glass p-6 rounded-2xl border-slate-800 space-y-5">
          <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800/80 pb-2">
            <Bell className="w-4 h-4" /> Security & Notification Preferences
          </h3>

          <div className="space-y-4">
            <Toggle
              enabled={emailOnLogin}
              onChange={setEmailOnLogin}
              label="Send me an email everytime someone logs into my account"
            />

            <Toggle
              enabled={showPerformanceBar}
              onChange={setShowPerformanceBar}
              label="Show Last Week/This Week Performance Bar On Orders Page?"
            />

            <Toggle
              enabled={forceDeliveredQtySelection}
              onChange={setForceDeliveredQtySelection}
              label="Force 'Delivered Quantity' Selection From Available Product Offers?"
            />

            <div className="pt-2 border-t border-slate-800/60 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">SEND ME LOW STOCK NOTIFICATION ON:</p>
                <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <Toggle enabled={lowStockSms} onChange={setLowStockSms} label="SMS" />
                  <Toggle enabled={lowStockEmail} onChange={setLowStockEmail} label="Email" />
                  <Toggle enabled={lowStockWhatsapp} onChange={setLowStockWhatsapp} label="WhatsApp (if active)" />
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">SEND ME REMINDER OF SCHEDULED ORDERS:</p>
                <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <Toggle enabled={reminderEmail} onChange={setReminderEmail} label="Email" />
                  <Toggle enabled={reminderWhatsapp} onChange={setReminderWhatsapp} label="WhatsApp (if active)" />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/60 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Toggle enabled={invoiceViaEmail} onChange={setInvoiceViaEmail} label="SEND MY CUSTOMERS INVOICE VIA EMAIL" />
              <Toggle enabled={invoiceViaWhatsapp} onChange={setInvoiceViaWhatsapp} label="SEND MY CUSTOMERS INVOICE VIA WHATSAPP" />
            </div>
          </div>
        </div>

        {/* ── SECTION 4: DISPATCH & INVENTORY RULES ── */}
        <div className="glass p-6 rounded-2xl border-slate-800 space-y-5">
          <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800/80 pb-2">
            <ShieldCheck className="w-4 h-4" /> Order Dispatch & Inventory Rules
          </h3>

          <div className="space-y-4">
            <Toggle
              enabled={preventDuplicateOrders}
              onChange={setPreventDuplicateOrders}
              label="Prevent More Than 1 Order Submission/Customer Within 24 Hours?"
            />

            <Toggle
              enabled={whatsappNotifyAgents}
              onChange={setWhatsappNotifyAgents}
              label="Notify Delivery Agents Via WhatsApp When Orders Are Assigned To Them?"
            />

            <Toggle
              enabled={selectCloserOnDelivered}
              onChange={setSelectCloserOnDelivered}
              label="On Order Delivered, Allow To Select Closer?"
            />

            <div className="pt-3 border-t border-slate-800/60 space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">STATE SELECTION OPTION ON FORMS</label>
              <select
                value={stateSelectionOption}
                onChange={e => setStateSelectionOption(e.target.value)}
                className="select text-xs max-w-sm"
              >
                <option value="Select State">Select State</option>
                <option value="Type State">Type State</option>
              </select>
              <p className="text-[11px] text-slate-400 italic">
                NOTE: if you choose 'Type State' option, CRM WILL NOT manage your inventory!
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800/60 space-y-2">
              <Toggle
                enabled={manageInventory}
                onChange={setManageInventory}
                label="Allow CRM manage my Products Inventory?"
              />
              {!manageInventory && (
                <p className="text-[11px] text-rose-400 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  If you turn this off, CRM WILL NOT be held accountable if your Inventory records are not accurate!
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800/60 space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                ENABLE ROUND ROBIN FOR ORDERS ASSIGNMENT AMONGST SALES REPS?
              </label>
              <select
                value={roundRobinAssignment}
                onChange={e => setRoundRobinAssignment(e.target.value)}
                className="select text-xs max-w-xs font-bold"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── ACTION BUTTONS FOOTER ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <button
            type="button"
            onClick={() => setShowAuditTrailModal(true)}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-bold flex items-center justify-center gap-2 border border-indigo-500/30 transition-all shadow"
          >
            <History className="w-4 h-4" /> Show Audit Trail (Deleted Orders)
          </button>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving Preferences...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Audit Trail Modal */}
      {showAuditTrailModal && (
        <AuditTrailModal onClose={() => setShowAuditTrailModal(false)} />
      )}
    </div>
  );
}
