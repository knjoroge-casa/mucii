import React, { useState } from 'react';
import { Plus, Calendar, User, MapPin, Edit3, Check, X, Trash2 } from 'lucide-react';

const TaskManagement = () => {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedAssignee, setSelectedAssignee] = useState('all');
  
  const [tasks, setTasks] = useState([]);

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
    'Living Room',
    'Dining Room', 
    'Kitchen',
    'Pantry',
    'Master Bedroom',
    'Master Bathroom',
    'Guest Bedroom',
    'Guest Bathroom',
    'Laundry Area'
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
  const assignees = ['You', 'Maria', 'John', 'Sarah', 'David'];

  // Get unique zones and assignees from tasks for filter buttons
  const uniqueZones = [...new Set(tasks.map(task => task.zone))];
  const uniqueAssignees = [...new Set(tasks.map(task => task.assignee))];

  // Filter tasks
  const activeTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  const filteredActiveTasks = activeTasks.filter(task => {
    if (activeFilter === 'zone' && selectedZone !== 'all' && task.zone !== selectedZone) return false;
    if (activeFilter === 'assignee' && selectedAssignee !== 'all' && task.assignee !== selectedAssignee) return false;
    return true;
  });

  const handleFilterChange = (filterType) => {
    setActiveFilter(filterType);
    if (filterType === 'all') {
      setSelectedZone('all');
      setSelectedAssignee('all');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingTask) {
      setTasks(prev => prev.map(task => 
        task.id === editingTask.id 
          ? { ...task, ...taskForm, id: editingTask.id }
          : task
      ));
      setEditingTask(null);
    } else {
      const newTask = {
        ...taskForm,
        id: Date.now(),
        completed: false,
        completedAt: null,
        completedBy: null,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setTasks(prev => [...prev, newTask]);
    }
    
    setShowTaskForm(false);
    resetForm();
  };

  const resetForm = () => {
    setTaskForm({
      title: '',
      description: '',
      zone: '',
      frequency: [],
      weekDays: [],
      priority: 'medium',
      assignee: '',
      date: ''
    });
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

  const handleComplete = (taskId) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { 
        ...task, 
        completed: !task.completed,
        completedAt: !task.completed ? new Date().toISOString() : null,
        completedBy: !task.completed ? task.assignee : null
      } : task
    ));
  };

  const handleDeleteConfirm = (taskId) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
    setDeleteConfirmTask(null);
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatCompletedDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const showWeekDaySelection = taskForm.frequency.includes('weekly') || taskForm.frequency.includes('custom');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-900 to-amber-600 bg-clip-text text-transparent">
            Task Management
          </h1>
          <p className="text-gray-600 mt-1">Organize and track your household tasks</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingTask(null);
            setShowTaskForm(true);
          }}
          className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-purple-900/25 hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Filter Section */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Filter Tasks</h2>
        </div>
        
        {/* Main Filter Buttons */}
        <div className="flex space-x-3 mb-4">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeFilter === 'all'
                ? 'bg-gradient-to-r from-purple-900 to-purple-800 text-white shadow-lg shadow-purple-900/25'
                : 'bg-white/70 text-gray-700 border border-gray-200 hover:bg-purple-50 hover:border-purple-200'
            }`}
            aria-label="Show all tasks without filtering"
            aria-pressed={activeFilter === 'all'}
          >
            All Tasks
          </button>
          
          <button
            onClick={() => handleFilterChange('zone')}
            className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeFilter === 'zone'
                ? 'bg-gradient-to-r from-purple-900 to-purple-800 text-white shadow-lg shadow-purple-900/25'
                : 'bg-white/70 text-gray-700 border border-gray-200 hover:bg-purple-50 hover:border-purple-200'
            }`}
            aria-label="Filter tasks by zone"
            aria-pressed={activeFilter === 'zone'}
          >
            Filter by Zone
          </button>
          
          <button
            onClick={() => handleFilterChange('assignee')}
            className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeFilter === 'assignee'
                ? 'bg-gradient-to-r from-purple-900 to-purple-800 text-white shadow-lg shadow-purple-900/25'
                : 'bg-white/70 text-gray-700 border border-gray-200 hover:bg-purple-50 hover:border-purple-200'
            }`}
            aria-label="Filter tasks by assignee"
            aria-pressed={activeFilter === 'assignee'}
          >
            Filter by Assignees
          </button>
        </div>

        {/* Zone Filter Options */}
        {activeFilter === 'zone' && (
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Select Zone:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedZone('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedZone === 'all'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                }`}
              >
                All Zones
              </button>
              {uniqueZones.map(zone => (
                <button
                  key={zone}
                  onClick={() => setSelectedZone(zone)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedZone === zone
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                  }`}
                >
                  {zone}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Assignee Filter Options */}
        {activeFilter === 'assignee' && (
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Select Assignee:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedAssignee('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedAssignee === 'all'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                }`}
              >
                All Assignees
              </button>
              {uniqueAssignees.map(assignee => (
                <button
                  key={assignee}
                  onClick={() => setSelectedAssignee(assignee)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedAssignee === assignee
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                  }`}
                >
                  {assignee}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Task Cards Grid */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Tasks ({filteredActiveTasks.length})</h2>
        {filteredActiveTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredActiveTasks.map((task) => (
              <div key={task.id} className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300">
                {/* Task Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 mb-2">
                      {task.title}
                    </h3>
                    <div className="flex items-center space-x-2 mb-2">
                      <MapPin className="w-4 h-4 text-purple-600" />
                      <span className="text-sm text-gray-600">{task.zone}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(task)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleComplete(task.id)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmTask(task)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Task Description */}
                {task.description && (
                  <p className="text-gray-600 text-sm mb-4">{task.description}</p>
                )}

                {/* Task Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Due: {formatDate(task.date)}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Assigned to {task.assignee}</span>
                  </div>
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
            <p className="text-gray-500">All tasks are completed or try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* Completed Tasks Section */}
      {completedTasks.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Completed Tasks ({completedTasks.length})</h2>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg overflow-hidden">
            <div className="divide-y divide-gray-200">
              {completedTasks.map((task) => (
                <div key={task.id} className="p-4 hover:bg-gray-50/50 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 line-through opacity-75">
                        {task.title}
                      </h3>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3 text-gray-400" />
                          <span className="text-sm text-gray-500">Completed by {task.completedBy}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span className="text-sm text-gray-500">{formatCompletedDate(task.completedAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleComplete(task.id)}
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                        title="Mark as incomplete"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmTask(task)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Task</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this task? This action cannot be undone.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setDeleteConfirmTask(null)}
                  className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteConfirm(deleteConfirmTask.id)}
                  className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Creation/Edit Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingTask ? 'Edit Task' : 'Add a Task'}
              </h2>
              <button
                onClick={() => {
                  setShowTaskForm(false);
                  setEditingTask(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Task Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Task Title *</label>
                <input
                  type="text"
                  required
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
                    {allZones.map(zone => (
                      <option key={zone} value={zone}>{zone}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddZone(true)}
                    className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Add Custom Zone Modal */}
              {showAddZone && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
                  <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                    <h3 className="text-lg font-bold mb-4">Add Custom Zone</h3>
                    <input
                      type="text"
                      value={newZone}
                      onChange={(e) => setNewZone(e.target.value)}
                      placeholder="Enter zone name"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
                    />
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddZone(false);
                          setNewZone('');
                        }}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={addCustomZone}
                        className="px-4 py-2 bg-purple-900 text-white rounded-lg hover:bg-purple-800"
                      >
                        Add Zone
                      </button>
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

              {/* Week Days Selection */}
              {showWeekDaySelection && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Select Days</label>
                  <div className="flex flex-wrap gap-2">
                    {weekDays.map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWeekDay(day)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          taskForm.weekDays.includes(day)
                            ? 'bg-purple-900 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Priority and Assign to */}
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
                  <select
                    value={taskForm.assignee}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, assignee: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select assignee</option>
                    {assignees.map(assignee => (
                      <option key={assignee} value={assignee}>{assignee}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={taskForm.date}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskForm(false);
                    setEditingTask(null);
                    resetForm();
                  }}
                  className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  {editingTask ? 'Update Task' : 'Create Task'}
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