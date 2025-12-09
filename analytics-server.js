// analytics-server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// File-based storage (persists across restarts)
const DATA_FILE = path.join(__dirname, 'analytics-data.json');

// Load existing data
let analyticsData = {
  events: [],
  students: {}
};

if (fs.existsSync(DATA_FILE)) {
  try {
    analyticsData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Save data function
function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(analyticsData, null, 2));
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// Track events endpoint
app.post('/api/track', (req, res) => {
  const { studentId, studentName, appUrl, eventType } = req.body;

  if (!studentId || !eventType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const event = {
    studentId,
    studentName: studentName || 'Unknown',
    appUrl: appUrl || 'Unknown',
    eventType,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.headers['user-agent']
  };

  analyticsData.events.push(event);

  // Update student summary
  if (!analyticsData.students[studentId]) {
    analyticsData.students[studentId] = {
      name: studentName,
      appUrl: appUrl,
      totalInteractions: 0,
      chatUsage: 0,
      summarizeUsage: 0,
      multimodalUsage: 0,
      ragUsage: 0,
      firstSeen: event.timestamp,
      lastSeen: event.timestamp
    };
  }

  const student = analyticsData.students[studentId];
  student.totalInteractions++;
  student.lastSeen = event.timestamp;

  // Update specific usage counters
  if (eventType === 'chat') student.chatUsage++;
  if (eventType === 'summarize') student.summarizeUsage++;
  if (eventType === 'multimodal') student.multimodalUsage++;
  if (eventType === 'rag') student.ragUsage++;

  saveData();

  res.json({ success: true, message: 'Event tracked' });
});

// Registration endpoint
app.post('/api/register', (req, res) => {
  const { studentId, studentName, email, githubRepo, deployedUrl } = req.body;

  if (!studentId || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!analyticsData.students[studentId]) {
    analyticsData.students[studentId] = {
      name: studentName || email,
      email: email,
      githubRepo: githubRepo || 'Not provided',
      appUrl: deployedUrl || 'Not deployed yet',
      totalInteractions: 0,
      chatUsage: 0,
      summarizeUsage: 0,
      multimodalUsage: 0,
      ragUsage: 0,
      registeredAt: new Date().toISOString(),
      firstSeen: null,
      lastSeen: null
    };
  } else {
    // Update existing student
    analyticsData.students[studentId].email = email;
    analyticsData.students[studentId].githubRepo = githubRepo || analyticsData.students[studentId].githubRepo;
    analyticsData.students[studentId].appUrl = deployedUrl || analyticsData.students[studentId].appUrl;
  }

  saveData();

  res.json({ success: true, message: 'Student registered' });
});

// Dashboard data endpoint
app.get('/api/dashboard', (req, res) => {
  const students = Object.values(analyticsData.students);
  const activeStudents = students.filter(s => s.totalInteractions > 0);

  const stats = {
    totalRegistered: students.length,
    totalActive: activeStudents.length,
    totalInteractions: analyticsData.events.length,
    totalChatUsage: students.reduce((sum, s) => sum + s.chatUsage, 0),
    totalSummarizeUsage: students.reduce((sum, s) => sum + s.summarizeUsage, 0),
    totalMultimodalUsage: students.reduce((sum, s) => sum + s.multimodalUsage, 0),
    totalRagUsage: students.reduce((sum, s) => sum + s.ragUsage, 0),
    studentsWithDeployments: students.filter(s => s.appUrl && s.appUrl !== 'Not deployed yet' && s.appUrl !== 'Unknown').length,
    students: students.sort((a, b) => b.totalInteractions - a.totalInteractions)
  };

  res.json(stats);
});

// Export data endpoint (for Meta AI reporting)
app.get('/api/export', (req, res) => {
  const { format } = req.query;

  if (format === 'csv') {
    const students = Object.values(analyticsData.students);
    let csv = 'Student ID,Name,Email,GitHub Repo,Deployed URL,Total Interactions,Chat Usage,Summarize Usage,Multimodal Usage,RAG Usage,Registered At,Last Seen\\n';

    students.forEach(s => {
      csv += `"${s.email || s.name}","${s.name}","${s.email || 'N/A'}","${s.githubRepo || 'N/A'}","${s.appUrl || 'N/A'}",${s.totalInteractions},${s.chatUsage},${s.summarizeUsage},${s.multimodalUsage || 0},${s.ragUsage || 0},"${s.registeredAt || s.firstSeen || 'N/A'}","${s.lastSeen || 'N/A'}"\\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="workshop-analytics.csv"');
    res.send(csv);
  } else {
    res.json(analyticsData);
  }
});

// HTML Dashboard
app.get('/dashboard', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meta AI Workshop Analytics</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body class="bg-gray-100">
  <div class="container mx-auto px-4 py-8">
    <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Meta AI Workshop Analytics</h1>
          <p class="text-gray-600 mt-2">Real-time tracking of student engagement and feature adoption</p>
        </div>
        <div class="text-right">
          <button onclick="refreshDashboard()" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg mb-2">🔄 Refresh</button><br>
          <a href="/api/export?format=csv" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg inline-block">📊 Export CSV</a>
        </div>
      </div>
    </div>

    <div id="stats" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"></div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h3 class="text-lg font-bold mb-4">Feature Usage</h3>
        <canvas id="featureChart"></canvas>
      </div>
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h3 class="text-lg font-bold mb-4">Student Engagement</h3>
        <canvas id="engagementChart"></canvas>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow-lg p-6">
      <h2 class="text-2xl font-bold mb-4">Student Activity</h2>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b">
              <th class="text-left py-3 px-4">Student</th>
              <th class="text-left py-3 px-4">Deployed App</th>
              <th class="text-center py-3 px-4">Total</th>
              <th class="text-center py-3 px-4">💬 Chat</th>
              <th class="text-center py-3 px-4">📝 Summarize</th>
              <th class="text-center py-3 px-4">🖼️ Multimodal</th>
              <th class="text-center py-3 px-4">🧠 RAG</th>
              <th class="text-left py-3 px-4">Last Active</th>
            </tr>
          </thead>
          <tbody id="studentsBody"></tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    let featureChart, engagementChart;

    async function refreshDashboard() {
      try {
        const res = await fetch('/api/dashboard');
        const data = await res.json();

        document.getElementById('stats').innerHTML = \`
          <div class="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
            <h3 class="text-3xl font-bold">\${data.totalRegistered}</h3>
            <p class="text-blue-100">Total Registered</p>
          </div>
          <div class="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
            <h3 class="text-3xl font-bold">\${data.totalActive}</h3>
            <p class="text-green-100">Active Students</p>
          </div>
          <div class="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
            <h3 class="text-3xl font-bold">\${data.totalInteractions}</h3>
            <p class="text-purple-100">Total Interactions</p>
          </div>
          <div class="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-lg">
            <h3 class="text-3xl font-bold">\${data.studentsWithDeployments}</h3>
            <p class="text-orange-100">Apps Deployed</p>
          </div>
        \`;

        if (featureChart) featureChart.destroy();
        const featureCtx = document.getElementById('featureChart').getContext('2d');
        featureChart = new Chart(featureCtx, {
          type: 'bar',
          data: {
            labels: ['Chat', 'Summarize', 'Multimodal', 'RAG'],
            datasets: [{
              label: 'Usage Count',
              data: [data.totalChatUsage, data.totalSummarizeUsage, data.totalMultimodalUsage, data.totalRagUsage],
              backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(34, 197, 94, 0.8)', 'rgba(168, 85, 247, 0.8)', 'rgba(249, 115, 22, 0.8)']
            }]
          },
          options: { responsive: true, maintainAspectRatio: true }
        });

        if (engagementChart) engagementChart.destroy();
        const engagementCtx = document.getElementById('engagementChart').getContext('2d');
        const engagementData = data.students.filter(s => s.totalInteractions > 0).slice(0, 10).map(s => ({
          name: s.name || s.email, interactions: s.totalInteractions
        }));

        engagementChart = new Chart(engagementCtx, {
          type: 'bar',
          data: {
            labels: engagementData.map(d => d.name),
            datasets: [{ label: 'Interactions', data: engagementData.map(d => d.interactions), backgroundColor: 'rgba(59, 130, 246, 0.8)' }]
          },
          options: { indexAxis: 'y', responsive: true, maintainAspectRatio: true }
        });

        const studentsHTML = data.students.map(s => {
          const isActive = s.totalInteractions > 0;
          const appLink = s.appUrl && s.appUrl !== 'Unknown' && s.appUrl !== 'Not deployed yet' 
            ? \`<a href="\${s.appUrl}" target="_blank" class="text-blue-500 hover:underline">View App</a>\`
            : '<span class="text-gray-400">Not deployed</span>';

          return \`<tr class="border-b hover:bg-gray-50 \${!isActive ? 'opacity-50' : ''}">
            <td class="py-3 px-4"><div class="font-semibold">\${s.name || 'Unknown'}</div><div class="text-sm text-gray-500">\${s.email || 'No email'}</div></td>
            <td class="py-3 px-4">\${appLink}</td>
            <td class="py-3 px-4 text-center font-bold">\${s.totalInteractions}</td>
            <td class="py-3 px-4 text-center">\${s.chatUsage}</td>
            <td class="py-3 px-4 text-center">\${s.summarizeUsage}</td>
            <td class="py-3 px-4 text-center">\${s.multimodalUsage || 0}</td>
            <td class="py-3 px-4 text-center">\${s.ragUsage || 0}</td>
            <td class="py-3 px-4 text-sm text-gray-500">\${s.lastSeen ? new Date(s.lastSeen).toLocaleString() : 'Never'}</td>
          </tr>\`;
        }).join('');

        document.getElementById('studentsBody').innerHTML = studentsHTML || '<tr><td colspan="8" class="text-center py-8 text-gray-500">No students registered yet</td></tr>';
      } catch (error) {
        console.error('Error loading dashboard:', error);
        alert('Failed to load dashboard data');
      }
    }

    refreshDashboard();
    setInterval(refreshDashboard, 30000);
  </script>
</body>
</html>`);
});

// Registration page
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meta AI Workshop Registration</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100">
  <div class="container mx-auto px-4 py-12 max-w-2xl">
    <div class="bg-white rounded-lg shadow-lg p-8">
      <h1 class="text-3xl font-bold mb-6">Meta AI Workshop Registration</h1>
      <p class="text-gray-600 mb-6">Register your workshop project to track your progress and feature adoption.</p>

      <form id="registrationForm" class="space-y-4">
        <div><label class="block text-sm font-semibold mb-2">Full Name *</label><input type="text" id="studentName" required class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="John Doe"></div>
        <div><label class="block text-sm font-semibold mb-2">Email Address *</label><input type="email" id="email" required class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="john@example.com"></div>
        <div><label class="block text-sm font-semibold mb-2">GitHub Repository URL</label><input type="url" id="githubRepo" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="https://github.com/username/repo"></div>
        <div><label class="block text-sm font-semibold mb-2">Deployed App URL</label><input type="url" id="deployedUrl" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="https://your-app.onrender.com"></div>
        <button type="submit" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg">Register</button>
      </form>

      <div id="result" class="mt-6 hidden"></div>

      <div class="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 class="font-semibold mb-2">Next Steps:</h3>
        <ol class="list-decimal list-inside space-y-1 text-sm text-gray-700">
          <li>Complete this registration form</li>
          <li>Copy your student ID (your email)</li>
          <li>Add it to your app's analytics config</li>
          <li>Deploy your app and start building!</li>
        </ol>
      </div>
    </div>
  </div>

  <script>
    document.getElementById('registrationForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        studentId: document.getElementById('email').value,
        studentName: document.getElementById('studentName').value,
        email: document.getElementById('email').value,
        githubRepo: document.getElementById('githubRepo').value,
        deployedUrl: document.getElementById('deployedUrl').value
      };

      try {
        const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const result = await res.json();
        const resultDiv = document.getElementById('result');
        resultDiv.classList.remove('hidden');

        if (result.success) {
          resultDiv.innerHTML = \`<div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <p class="font-bold">✅ Registration Successful!</p>
            <p class="text-sm mt-2">Your Student ID: <code class="bg-white px-2 py-1 rounded">\${data.email}</code></p>
            <p class="text-sm mt-2">Add this to your app's ANALYTICS_CONFIG.studentId</p>
          </div>\`;
        } else {
          resultDiv.innerHTML = \`<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p class="font-bold">❌ Registration Failed</p>
            <p class="text-sm">\${result.error || 'Please try again'}</p>
          </div>\`;
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Registration failed. Please try again.');
      }
    });
  </script>
</body>
</html>`);
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Analytics Server Running!`);
  console.log(`   Registration: http://localhost:${PORT}/`);
  console.log(`   Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`   API: http://localhost:${PORT}/api/track\n`);
});
