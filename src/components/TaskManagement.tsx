import React, { useState, useEffect } from 'react';
import { Plus, Calendar, User, MapPin, Edit3, Check, X, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { getPermissions } from '../utils/permissions';

const TaskManagement = ({ tasks, setTasks, activeUserRole = 'viewer' }) => {
  const can = getPermissions(activeUserRole);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedAssignee, setSelectedAssignee] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assignees, setAssignees] = useState([]);

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    zone: '',
    frequency: [],
    weekDays: [],
    priority: 'medium',
    assignee: '',
    date: ''
  });

  const [customZones, setCustomZones] = useState([]);
  const [newZone, setNewZone] = useState('');
  const [showAddZone, setShowAddZone] = useState(false);

  const defaultZones = [
    'Living Room', 'Dining Room', 'Kitchen', 'Pantry',
    'Master Bedroom', 'Master Bathroom', 'Guest Bedroom',
    'Guest Bathroom', 'Laundry Area'
  ];
  const allZones = [...defaultZones, ...customZones];

  const frequencies = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'biannual', label: 'Every 6 months' },
    { value: 'annual', label: 'Yearly' },
    { value: 'custom', label: 'Custom' }
  ];
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Map DB row to local task shape
  const mapDbTask = (row) => ({
    id: row.id,
    title: row.title,
    description: row.description || '',
    zone: row.zone,
    frequency: row.frequency || [],
    weekDays: row.week_days || [],
    priority: row.priority,
    assignee: row.assignee || '',
    date: row.due_date || '',
    completed: row.completed,
    completedAt: row.completed_at,
    completedBy: row.completed_by,
    createdAt: row.created_at
  });

  // Load tasks from Supabase
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setTasks((data || []).map(mapDbTask));
      } catch (err) {
        console.error('Could not load tasks:', err.message);
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, []);

  // Load household members for assignee dropdown
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name')
          .order('full_name');
        if (error) throw error;
        setAssignees((data || []).map(u => u.full_name).filter(Boolean));
      } catch (err) {
        // Fall back to empty — user can still type assignee manually
        console.error('Could not load users:', err.message);
      }
    };
    loadUsers();
  }, []);

  // Derived lists
  const uniqueZones = [...new Set(tasks.map(t => t.zone).filter(Boolean))];
  const uniqueAssignees = [...new Set(tasks.map(t => t.assignee).filter(Boolean))];
  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  const filteredActiveTasks = activeTasks.filter(task => {
    if (activeFilter === 'zone' && selectedZone !== 'all' && task.zone !== selectedZone) return false;
    if (activeFilter === 'assignee' && selectedAssignee !== 'all' && task.assignee !== selectedAssignee) return false;
    return true;
  });

  const handleFilterChange = (filterType) => {
    setActiveFilter(filterType);
    if (filterType === 'all') { setSelectedZone('all'); setSelectedAssignee('all'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      title: taskForm.title,
      description: taskForm.description,
      zone: taskForm.zone,
      frequency: taskForm.frequency,
      week_days: taskForm.weekDays,
      priority: taskForm.priority,
      assignee: taskForm.assignee,
      due_date: taskForm.date || null,
    };

    try {
      if (editingTask) {
        const { data, error } = await supabase
          .from('tasks')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingTask.id)
          .select()
          .single();
        if (error) throw error;
        setTasks(prev => prev.map(t => t.id === editingTask.id ? mapDbTask(data) : t));
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
          .from('tasks')
          .insert({ ...payload, user_id: user?.id, completed: false })
          .select()
          .single();
        if (error) throw error;
        setTasks(prev => [mapDbTask(data), ...prev]);
      }
    } catch (err) {
      console.error('Could not save task:', err.message);
      // Optimistic fallback — save locally so UI still works
      if (editingTask) {
        setTasks(prev => prev.map(t =>
          t.id === editingTask.id ? { ...t, ...taskForm } : t
        ));
      } else {
        setTasks(prev => [{
          ...taskForm,
          id: Date.now(),
          completed: false,
          completedAt: null,
          completedBy: null,
          createdAt: new Date().toISOString()
        }, ...prev]);
      }
    } finally {
      setSaving(false);
      setShowTaskForm(false);
      setEditingTask(null);
      resetForm();
    }
  };

  const handleComplete = async (task) => {
    const nowCompleted = !task.completed;
    const updates = {
      completed: nowCompleted,
      completed_at: nowCompleted ? new Date().toISOString() : null,
      completed_by: nowCompleted ? (task.assignee || 'Unknown') : null,
      updated_at: new Date().toISOString()
    };
    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === task.id ? {
        ...t,
        completed: nowCompleted,
        completedAt: updates.completed_at,
        completedBy: updates.completed_by
      } : t
    ));
    try {
      const { error } = await supabase.from('tasks').update(updates).eq('id', task.id);
      if (error) throw error;
    } catch (err) {
      console.error('Could not update task:', err.message);
      // Revert on failure
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    }
  };

  const handleDeleteConfirm = async (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setDeleteConfirmTask(null);
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    } catch (err) {
      console.error('Could not delete task:', err.message);
    }
  };

  const handleEdit = (task) => {
    setTaskForm({
      title: task.title,
      description: task.description,
      zone: task.zone,
      frequency: task.frequency,
      weekDays: task.weekDays,
      priority: task.priority,
      assignee: task.assignee,
      date: task.date
    });
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const resetForm = () => {
    setTaskForm({ title: '', description: '', zone: '', frequency: [], weekDays: [], priority: 'medium', assignee: '', date: '' });
  };

  const toggleFrequency = (freq) => {
    setTaskForm(prev => ({
      ...prev,
      frequency: prev.frequency.includes(freq)
        ? prev.frequency.filter(f => f !== freq)
        : [...prev.frequency, freq]
    }));
  };

  const toggleWeekDay = (day) => {
    setTaskForm(prev => ({
      ...prev,
      weekDays: prev.weekDays.includes(day)
        ? prev.weekDays.filter(d => d !== day)
        : [...prev.weekDays, day]
    }));
  };

  const addCustomZone = () => {
    if (newZone.trim() && !allZones.includes(newZone.trim())) {
      setCustomZones(prev => [...prev, newZone.trim()]);
      setNewZone('');
      setShowAddZone(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-600 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-600 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-600 border-green-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatCompletedDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const showWeekDaySelection = taskForm.frequency.includes('weekly') || taskForm.frequency.includes('custom');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <span className="ml-3 text-gray-600 font-medium">Loading tasks...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-900 to-amber-600 bg-clip-text text-transparent">
            Task Management
          </h1>
          <p className="text-gray-600 mt-1">Organise and track your household tasks</p>
        </div>
        {can.canAddTask && (
          <button
            onClick={() => { resetForm(); setEditingTask(null); setShowTaskForm(true); }}
            className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-purple-900/25 hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Task</span>
          </button>
        )}
      </div>

      {/* Filter Section */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg">
        <div className="flex space-x-3 mb-4">
          {['all', 'zone', 'assignee'].map(filter => (
            <button
              key={filter}
              onClick={() => handleFilterChange(filter)}
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeFilter === filter
                  ? 'bg-gradient-to-r from-purple-900 to-purple-800 text-white shadow-lg shadow-purple-900/25'
                  : 'bg-white/70 text-gray-700 border border-gray-200 hover:bg-purple-50 hover:border-purple-200'
              }`}
            >
              {filter === 'all' ? 'All Tasks' : filter === 'zone' ? 'Filter by Zone' : 'Filter by Assignee'}
            </button>
          ))}
        </div>

        {activeFilter === 'zone' && uniqueZones.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Select Zone:</p>
            <div className="flex flex-wrap gap-2">
              {['all', ...uniqueZones].map(zone => (
                <button
                  key={zone}
                  onClick={() => setSelectedZone(zone)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    selectedZone === zone
                      ? 'bg-purple-100 text-purple-800 border-purple-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200'
                  }`}
                >
                  {zone === 'all' ? 'All Zones' : zone}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeFilter === 'assignee' && uniqueAssignees.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Select Assignee:</p>
            <div className="flex flex-wrap gap-2">
              {['all', ...uniqueAssignees].map(assignee => (
                <button
                  key={assignee}
                  onClick={() => setSelectedAssignee(assignee)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    selectedAssignee === assignee
                      ? 'bg-purple-100 text-purple-800 border-purple-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200'
                  }`}
                >
                  {assignee === 'all' ? 'All Assignees' : assignee}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Tasks */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Tasks ({filteredActiveTasks.length})</h2>
        {filteredActiveTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredActiveTasks.map((task) => (
              <div key={task.id} className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-gray-900 mb-2 truncate">{task.title}</h3>
                    {task.zone && (
                      <div className="flex items-center space-x-2 mb-2">
                        <MapPin className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{task.zone}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-1 ml-2">
                    {can.canEditTask && (
                      <button onClick={() => handleEdit(task)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    {can.canCompleteTask && (
                      <button onClick={() => handleComplete(task)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all">
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    {can.canDeleteTask && (
                      <button onClick={() => setDeleteConfirmTask(task)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {task.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{task.description}</p>
                )}

                <div className="space-y-2">
                  {task.date && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{formatDate(task.date)}</span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                  )}
                  {!task.date && (
                    <div className="flex justify-end">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                  )}
                  {task.assignee && (
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{task.assignee}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-12 border border-white/50 shadow-lg text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No active tasks</h3>
            <p className="text-gray-500">
              {activeFilter !== 'all' ? 'Try adjusting your filters' : 'Add a task to get started'}
            </p>
          </div>
        )}
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Completed Tasks ({completedTasks.length})</h2>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg overflow-hidden">
            <div className="divide-y divide-gray-100">
              {completedTasks.map((task) => (
                <div key={task.id} className="p-4 hover:bg-gray-50/50 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-500 line-through truncate">{task.title}</h3>
                      <div className="flex items-center space-x-4 mt-1">
                        {task.completedBy && (
                          <div className="flex items-center space-x-1">
                            <User className="w-3 h-3 text-gray-400" />
                            <span className="text-sm text-gray-400">Completed by {task.completedBy}</span>
                          </div>
                        )}
                        {task.completedAt && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span className="text-sm text-gray-400">{formatCompletedDate(task.completedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-2">
                      {can.canCompleteTask && (
                        <button
                          onClick={() => handleComplete(task)}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                          title="Mark as incomplete"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      {can.canDeleteTask && (
                        <button
                          onClick={() => setDeleteConfirmTask(task)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Task</h2>
              <p className="text-gray-600 mb-6">Are you sure you want to delete <span className="font-semibold">"{deleteConfirmTask.title}"</span>? This cannot be undone.</p>
              <div className="flex justify-center space-x-4">
                <button onClick={() => setDeleteConfirmTask(null)} className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all">
                  Cancel
                </button>
                <button onClick={() => handleDeleteConfirm(deleteConfirmTask.id)} className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-all">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Form Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingTask ? 'Edit Task' : 'Add a Task'}
              </h2>
              <button onClick={() => { setShowTaskForm(false); setEditingTask(null); resetForm(); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Task Title *</label>
                <input
                  type="text" required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Clean bathroom"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Additional instructions or details..."
                />
              </div>

              {/* Zone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Zone *</label>
                <div className="flex space-x-2">
                  <select
                    required
                    value={taskForm.zone}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, zone: e.target.value }))}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select zone</option>
                    {allZones.map(zone => <option key={zone} value={zone}>{zone}</option>)}
                  </select>
                  <button type="button" onClick={() => setShowAddZone(true)} className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Custom Zone Modal */}
              {showAddZone && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                  <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                    <h3 className="text-lg font-bold mb-4">Add Custom Zone</h3>
                    <input
                      type="text" value={newZone}
                      onChange={(e) => setNewZone(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCustomZone()}
                      placeholder="Enter zone name"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
                    />
                    <div className="flex justify-end space-x-3">
                      <button type="button" onClick={() => { setShowAddZone(false); setNewZone(''); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                      <button type="button" onClick={addCustomZone} className="px-4 py-2 bg-purple-900 text-white rounded-lg hover:bg-purple-800">Add Zone</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Frequency */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Frequency</label>
                <div className="grid grid-cols-2 gap-3">
                  {frequencies.map(freq => (
                    <label key={freq.value} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={taskForm.frequency.includes(freq.value)}
                        onChange={() => toggleFrequency(freq.value)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">{freq.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Week Days */}
              {showWeekDaySelection && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Select Days</label>
                  <div className="flex flex-wrap gap-2">
                    {weekDays.map(day => (
                      <button
                        key={day} type="button"
                        onClick={() => toggleWeekDay(day)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          taskForm.weekDays.includes(day) ? 'bg-purple-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Priority & Assignee */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Assign to</label>
                  {assignees.length > 0 ? (
                    <select
                      value={taskForm.assignee}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, assignee: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select assignee</option>
                      {assignees.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={taskForm.assignee}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, assignee: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter name"
                    />
                  )}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Due Date</label>
                <input
                  type="date"
                  value={taskForm.date}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => { setShowTaskForm(false); setEditingTask(null); resetForm(); }}
                  className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={saving}
                  className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center space-x-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{saving ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManagement;
