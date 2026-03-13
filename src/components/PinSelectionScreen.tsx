import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Loader2, LogOut, RotateCcw, Eye, EyeOff } from 'lucide-react';
interface HouseholdMember {
  id: string;
  full_name: string;
  role: string;
  is_owner: boolean;
  display_order: number;
  hashed_pin: string | null;
}

export interface ActiveUser {
  id: string;
  full_name: string;
  role: string;
  is_owner: boolean;
}

interface PinSelectionScreenProps {
  houseName: string;
  homeId: string;
  onUserSelected: (user: ActiveUser) => void;
  onSignOut: () => void;
}



async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

const PinSelectionScreen: React.FC<PinSelectionScreenProps> = ({
  houseName, homeId, onUserSelected, onSignOut
}) => {
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<HouseholdMember | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [validating, setValidating] = useState(false);
  const [needsOwnerPinSetup, setNeedsOwnerPinSetup] = useState(false);
  const [newOwnerPin, setNewOwnerPin] = useState('');
  const [newOwnerPinConfirm, setNewOwnerPinConfirm] = useState('');
  const [ownerPinSetupError, setOwnerPinSetupError] = useState('');
  const [ownerPinSetupSaving, setOwnerPinSetupSaving] = useState(false);
  const [showNewOwnerPin, setShowNewOwnerPin] = useState(false);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const { data, error } = await supabase
          .from('home_members')
          .select('display_order, users(id, full_name, role, is_owner, hashed_pin)')
          .eq('home_id', homeId)
          .order('display_order', { ascending: true });
        // Flatten the join result
        const flatData = (data || [])
          .map((row: any) => ({ ...row.users, display_order: row.display_order }))
          .filter(Boolean)
          .sort((a: any, b: any) => a.full_name.localeCompare(b.full_name));
        if (error) throw error;
        setMembers(flatData);
      } catch (err: any) {
        console.error('Could not load members:', err.message);
      } finally {
        setLoading(false);
      }
    };
    loadMembers();
  }, []);

  const handleCardClick = (member: HouseholdMember) => {
    setSelectedMember(member);
    setPin('');
    setPinError('');
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length >= 4 || validating) return;
    const newPin = pin + digit;
    setPin(newPin);
    setPinError('');
    if (newPin.length === 4) validatePin(newPin);
  };

  const handlePinBackspace = () => {
    if (validating) return;
    setPin(prev => prev.slice(0, -1));
    setPinError('');
  };
const handleOwnerPinSetup = async () => {
    setOwnerPinSetupError('');
    if (!/^\d{4}$/.test(newOwnerPin)) { setOwnerPinSetupError('PIN must be exactly 4 digits.'); return; }
    if (newOwnerPin !== newOwnerPinConfirm) { setOwnerPinSetupError('PINs do not match.'); return; }
    setOwnerPinSetupSaving(true);
    try {
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(newOwnerPin));
      const hashed = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      const { error } = await supabase.from('users').update({ hashed_pin: hashed }).eq('id', selectedMember!.id);
      if (error) throw error;
      // Update local member so PIN entry works immediately
      setMembers(prev => prev.map(m => m.id === selectedMember!.id ? { ...m, hashed_pin: hashed } : m));
      setSelectedMember(prev => prev ? { ...prev, hashed_pin: hashed } : prev);
      setNeedsOwnerPinSetup(false);
      setNewOwnerPin('');
      setNewOwnerPinConfirm('');
    } catch (err: any) {
      setOwnerPinSetupError(`Could not save PIN: ${err.message}`);
    } finally {
      setOwnerPinSetupSaving(false);
    }
  };
  const validatePin = async (enteredPin: string) => {
    if (!selectedMember) return;
    setValidating(true);
    setPinError('');
    try {
      if (!selectedMember.hashed_pin) {
        if (selectedMember.is_owner) {
          setNeedsOwnerPinSetup(true);
        } else {
          setPinError('No PIN set. Ask the Owner to set one.');
        }
        setPin('');
        setValidating(false);
        return;
      }
      const hashed = await hashPin(enteredPin);
      if (hashed === selectedMember.hashed_pin) {
        onUserSelected({
          id: selectedMember.id,
          full_name: selectedMember.full_name,
          role: selectedMember.role,
          is_owner: selectedMember.is_owner,
        });
      } else {
        setPinError('Incorrect PIN. Try again.');
        setPin('');
      }
    } catch {
      setPinError('Something went wrong. Try again.');
      setPin('');
    } finally {
      setValidating(false);
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-900 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">M</span>
          </div>
          <Loader2 className="w-6 h-6 text-purple-600 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-amber-50">

      {/* Header */}
    <img src="/assets/Mheaderlogo.png" alt="Mûcií" className="h-18 w-auto" />
        <button
          onClick={onSignOut}
          className="flex items-center space-x-2 text-sm text-gray-500 hover:text-red-600 transition-colors px-3 py-2 rounded-lg hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">

        {!selectedMember ? (
          <>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {greeting()}, {houseName}
              </h2>
              <p className="text-gray-500 text-lg">Who's home? Tap your name to continue.</p>
            </div>

            {members.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500">No household members found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 justify-items-center">
                {members.map(member => (
                  <button
                    key={member.id}
                    onClick={() => handleCardClick(member)}
                    className="w-full max-w-[180px] bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/60 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 text-center"
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl shadow-md">
                      {member.full_name.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="font-bold text-gray-900 text-base leading-tight mb-2">
                      {member.full_name.split(' ')[0]}
                    </h3>
                  </button>
                ))}
              </div>
            )}
          </>

        ) : (

          /* PIN Entry */
          <div className="flex items-center justify-center min-h-[70vh]">
            <div className="w-full max-w-sm">
              <button
                onClick={() => { setSelectedMember(null); setPin(''); setPinError(''); }}
                className="flex items-center space-x-2 text-gray-500 hover:text-purple-900 mb-8 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="text-sm">Switch user</span>
              </button>

              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-3xl shadow-lg">
                  {selectedMember.full_name.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedMember.full_name}</h2>
      
                <p className="text-gray-500 mt-4 text-sm">Enter your 4-digit PIN</p>
              </div>

              {/* PIN dots */}
              <div className="flex justify-center space-x-4 mb-6">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className={`w-4 h-4 rounded-full transition-all duration-150 ${
                    i < pin.length ? 'bg-purple-800 scale-110' : 'bg-gray-300'
                  }`} />
                ))}
              </div>

              {pinError && (
                <p className="text-center text-red-600 text-sm mb-4 font-medium">{pinError}</p>
              )}
              {validating && (
                <div className="flex justify-center mb-4">
                  <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                </div>
              )}
{needsOwnerPinSetup && (
                <div className="mb-6 p-5 bg-purple-50 rounded-2xl border border-purple-200 space-y-3">
                  <p className="text-sm font-semibold text-purple-900 text-center">Set your owner PIN to continue</p>
                  <div className="relative">
                    <input
                      type={showNewOwnerPin ? 'text' : 'password'}
                      value={newOwnerPin}
                      onChange={e => setNewOwnerPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full px-4 py-3 pr-12 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-2xl tracking-widest"
                      placeholder="New PIN"
                      maxLength={4}
                    />
                    <button type="button" onClick={() => setShowNewOwnerPin(!showNewOwnerPin)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showNewOwnerPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <input
                    type={showNewOwnerPin ? 'text' : 'password'}
                    value={newOwnerPinConfirm}
                    onChange={e => setNewOwnerPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-2xl tracking-widest"
                    placeholder="Confirm PIN"
                    maxLength={4}
                  />
                  {ownerPinSetupError && <p className="text-red-600 text-sm text-center">{ownerPinSetupError}</p>}
                  <button onClick={handleOwnerPinSetup} disabled={ownerPinSetupSaving || newOwnerPin.length !== 4}
                    className="w-full py-3 bg-gradient-to-r from-purple-900 to-purple-800 text-white rounded-xl font-semibold disabled:opacity-60 flex items-center justify-center space-x-2">
                    {ownerPinSetupSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{ownerPinSetupSaving ? 'Saving...' : 'Set PIN & Continue'}</span>
                  </button>
                </div>
              )}
              {/* Keypad */}
              <div className="grid grid-cols-3 gap-3">
                {['1','2','3','4','5','6','7','8','9'].map(digit => (
                  <button key={digit} onClick={() => handlePinDigit(digit)}
                    disabled={validating || pin.length >= 4}
                    className="h-16 bg-white/80 backdrop-blur-sm rounded-2xl text-xl font-bold text-gray-800 border border-gray-200 shadow-sm hover:bg-purple-50 hover:border-purple-200 hover:text-purple-900 active:scale-95 transition-all disabled:opacity-50"
                  >{digit}</button>
                ))}
                <div />
                <button onClick={() => handlePinDigit('0')}
                  disabled={validating || pin.length >= 4}
                  className="h-16 bg-white/80 backdrop-blur-sm rounded-2xl text-xl font-bold text-gray-800 border border-gray-200 shadow-sm hover:bg-purple-50 hover:border-purple-200 hover:text-purple-900 active:scale-95 transition-all disabled:opacity-50"
                >0</button>
                <button onClick={handlePinBackspace}
                  disabled={validating || pin.length === 0}
                  className="h-16 bg-white/80 backdrop-blur-sm rounded-2xl text-xl text-gray-500 border border-gray-200 shadow-sm hover:bg-red-50 hover:border-red-200 hover:text-red-600 active:scale-95 transition-all disabled:opacity-30"
                >⌫</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PinSelectionScreen;
