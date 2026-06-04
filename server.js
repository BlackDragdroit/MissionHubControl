const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Verbindung zur PostgreSQL-Datenbank (Internes Coolify-Netzwerk benötigt kein SSL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' 
    ? { rejectUnauthorized: false } 
    : false
});

// Datenbank beim Start initialisieren
async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT,
        phases JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("PostgreSQL-Datenbank erfolgreich initialisiert.");
  } catch (err) {
    console.error("Fehler bei der Datenbank-Initialisierung:", err);
  } finally {
    client.release();
  }
}

initDb();

// --- API ENDPUNKTE ---

// 1. Alle Projekte laden
app.get('/api/projects', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM projects ORDER BY updated_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fehler beim Laden" });
  }
});

// 2. Projekt speichern oder updaten
app.post('/api/projects', async (req, res) => {
  const { id, name, description, color, phases } = req.body;
  try {
    await pool.query(`
      INSERT INTO projects (id, name, description, color, phases)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name, description = EXCLUDED.description, color = EXCLUDED.color, phases = EXCLUDED.phases, updated_at = NOW()
    `, [id, name, description, color, JSON.stringify(phases)]);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fehler beim Speichern" });
  }
});

// 3. Projekt löschen
app.delete('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fehler beim Löschen" });
  }
});

// --- FRONTEND AUSLIEFERUNG (EINGEBETTETES REACT) ---
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Mission Control Hub</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        hub: { dark: '#090d16', card: '#111827', border: '#1f2937', accent: '#3b82f6' }
                    }
                }
            }
        }
    </script>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #090d16; }
        ::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 4px; }
    </style>
</head>
<body class="bg-hub-dark text-slate-100 min-h-screen font-sans antialiased">
    <div id="root"></div>

    <script type="text/babel">
        const { useState, useEffect } = React;

        const COLOR_THEMES = {
            blue: { border: 'border-blue-500/30', text: 'text-blue-400', bg: 'bg-blue-500/10', solid: 'bg-blue-500', fill: 'from-blue-600/20 to-transparent' },
            purple: { border: 'border-purple-500/30', text: 'text-purple-400', bg: 'bg-purple-500/10', solid: 'bg-purple-500', fill: 'from-purple-600/20 to-transparent' },
            emerald: { border: 'border-emerald-500/30', text: 'text-emerald-400', bg: 'bg-emerald-500/10', solid: 'bg-emerald-500', fill: 'from-emerald-600/20 to-transparent' },
            rose: { border: 'border-rose-500/30', text: 'text-rose-400', bg: 'bg-rose-500/10', solid: 'bg-rose-500', fill: 'from-rose-600/20 to-transparent' },
            amber: { border: 'border-amber-500/30', text: 'text-amber-400', bg: 'bg-amber-500/10', solid: 'bg-amber-500', fill: 'from-amber-600/20 to-transparent' },
            cyan: { border: 'border-cyan-500/30', text: 'text-cyan-400', bg: 'bg-cyan-500/10', solid: 'bg-cyan-500', fill: 'from-cyan-600/20 to-transparent' }
        };

        function App() {
            const [projects, setProjects] = useState([]);
            const [activeProjectId, setActiveProjectId] = useState(null);
            const [toast, setToast] = useState({ show: false, message: '' });
            const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
            
            const [newProjName, setNewProjName] = useState('');
            const [newProjDesc, setNewProjDesc] = useState('');
            const [newProjColor, setNewProjColor] = useState('blue');

            useEffect(() => {
                fetch('/api/projects')
                    .then(res => res.json())
                    .then(data => setProjects(data))
                    .catch(err => console.error(err));
            }, []);

            const saveProjectToDb = (updatedProj) => {
                fetch('/api/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedProj)
                })
                .then(() => showNotification("Cloud synchronisiert!"))
                .catch(err => console.error(err));
            };

            const showNotification = (msg) => {
                setToast({ show: true, message: msg });
                setTimeout(() => setToast({ show: false, message: '' }), 2000);
            };

            const handleCreateProject = (e) => {
                e.preventDefault();
                if (!newProjName.trim()) return;

                const newProject = {
                    id: 'proj-' + Date.now(),
                    name: newProjName,
                    description: newProjDesc || 'Keine Beschreibung vorhanden.',
                    color: newProjColor,
                    phases: []
                };

                setProjects([...projects, newProject]);
                setIsNewProjectModalOpen(false);
                setNewProjName('');
                setNewProjDesc('');
                saveProjectToDb(newProject);
            };

            const handleDeleteProject = (projId, e) => {
                e.stopPropagation();
                if (confirm("Projekt wirklich aus der魅力 Datenbank löschen?")) {
                    setProjects(projects.filter(p => p.id !== projId));
                    fetch('/api/projects/' + projId, { method: 'DELETE' })
                        .then(() => showNotification("Projekt gelöscht."))
                        .catch(err => console.error(err));
                }
            };

            const handleAddPhase = (projId, phaseTitle) => {
                if (!phaseTitle.trim()) return;
                let targetProj = null;
                const updated = projects.map(proj => {
                    if (proj.id === projId) {
                        targetProj = { ...proj, phases: [...proj.phases, { id: 'phase-' + Date.now(), title: phaseTitle, goals: [] }] };
                        return targetProj;
                    }
                    return proj;
                });
                setProjects(updated);
                if (targetProj) saveProjectToDb(targetProj);
            };

            const handleDeletePhase = (projId, phaseId) => {
                let targetProj = null;
                const updated = projects.map(proj => {
                    if (proj.id === projId) {
                        targetProj = { ...proj, phases: proj.phases.filter(p => p.id !== phaseId) };
                        return targetProj;
                    }
                    return proj;
                });
                setProjects(updated);
                if (targetProj) saveProjectToDb(targetProj);
            };

            const handleUpdatePhaseTitle = (projId, phaseId, newTitle) => {
                let targetProj = null;
                const updated = projects.map(proj => {
                    if (proj.id === projId) {
                        targetProj = { ...proj, phases: proj.phases.map(p => p.id === phaseId ? { ...p, title: newTitle } : p) };
                        return targetProj;
                    }
                    return proj;
                });
                setProjects(updated);
                if (targetProj) saveProjectToDb(targetProj);
            };

            const handleAddGoal = (projId, phaseId, goalText, isContinuous) => {
                if (!goalText.trim()) return;
                let targetProj = null;
                const updated = projects.map(proj => {
                    if (proj.id === projId) {
                        targetProj = {
                            ...proj,
                            phases: proj.phases.map(p => {
                                if (p.id === phaseId) {
                                    return { ...p, goals: [...p.goals, { id: 'goal-' + Date.now(), text: goalText, completed: false, continuous: isContinuous }] };
                                }
                                return p;
                            })
                        };
                        return targetProj;
                    }
                    return proj;
                });
                setProjects(updated);
                if (targetProj) saveProjectToDb(targetProj);
            };

            const handleToggleGoal = (projId, phaseId, goalId) => {
                let targetProj = null;
                const updated = projects.map(proj => {
                    if (proj.id === projId) {
                        targetProj = {
                            ...proj,
                            phases: proj.phases.map(p => {
                                if (p.id === phaseId) {
                                    return { ...p, goals: p.goals.map(g => g.id === goalId ? { ...g, completed: !g.completed } : g) };
                                }
                                return p;
                            })
                        };
                        return targetProj;
                    }
                    return proj;
                });
                setProjects(updated);
                if (targetProj) saveProjectToDb(targetProj);
            };

            const handleUpdateGoalText = (projId, phaseId, goalId, newText) => {
                let targetProj = null;
                const updated = projects.map(proj => {
                    if (proj.id === projId) {
                        targetProj = {
                            ...proj,
                            phases: proj.phases.map(p => {
                                if (p.id === phaseId) {
                                    return { ...p, goals: p.goals.map(g => g.id === goalId ? { ...g, text: newText } : g) };
                                }
                                return p;
                            })
                        };
                        return targetProj;
                    }
                    return proj;
                });
                setProjects(updated);
                if (targetProj) saveProjectToDb(targetProj);
            };

            const handleDeleteGoal = (projId, phaseId, goalId) => {
                let targetProj = null;
                const updated = projects.map(proj => {
                    if (proj.id === projId) {
                        targetProj = { ...proj, phases: proj.phases.map(p => { if (p.id === phaseId) { return { ...p, goals: p.goals.filter(g => g.id !== goalId) }; } return p; }) };
                        return targetProj;
                    }
                    return proj;
                });
                setProjects(updated);
                if (targetProj) saveProjectToDb(targetProj);
            };

            const activeProject = projects.find(p => p.id === activeProjectId);

            return (
                <div class="flex flex-col min-h-screen">
                    <header class="border-b border-slate-800 bg-hub-card/60 backdrop-blur-md sticky top-0 z-40 px-4 py-4 sm:px-6">
                        <div class="max-w-5xl mx-auto flex justify-between items-center">
                            <div class="flex items-center gap-3 cursor-pointer" onClick={() => setActiveProjectId(null)}>
                                <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">M</div>
                                <div>
                                    <h1 class="text-lg font-bold tracking-tight">Mission Control</h1>
                                    <p class="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">PostgreSQL Cloud Sync</p>
                                </div>
                            </div>
                            {activeProjectId === null && (
                                <button onClick={() => setIsNewProjectModalOpen(true)} class="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3.5 py-2 rounded-lg font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-500/10 transition-all">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                                    <span>Neues Projekt</span>
                                </button>
                            )}
                        </div>
                    </header>

                    <main class="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
                        {activeProjectId === null ? (
                            <div class="space-y-8">
                                <div class="bg-gradient-to-r from-slate-900 via-hub-card to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
                                    <div class="absolute -right-16 -bottom-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
                                    <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-white relative z-10">Zentrales Kontrollzentrum</h2>
                                    <p class="text-sm text-slate-400 max-w-xl relative z-10 font-normal">Deine Zeitachsen werden live in PostgreSQL gesichert und geräteübergreifend synchronisiert.</p>
                                </div>

                                <div class="space-y-4">
                                    <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-500">Projekte in der Cloud</h3>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {projects.map(proj => {
                                            const theme = COLOR_THEMES[proj.color] || COLOR_THEMES.blue;
                                            let totalGoals = 0, completedGoals = 0;
                                            proj.phases.forEach(p => p.goals.forEach(g => { totalGoals++; if (g.completed) completedGoals++; }));
                                            const progressPercent = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

                                            return (
                                                <div key={proj.id} onClick={() => setActiveProjectId(proj.id)} class="bg-hub-card border border-slate-800/80 hover:border-slate-700 rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.01] relative flex flex-col justify-between group overflow-hidden shadow-xl">
                                                    <div class="space-y-2">
                                                        <div class="flex justify-between items-start">
                                                            <h4 class="text-lg font-bold text-slate-100 group-hover:text-blue-400 transition-colors">{proj.name}</h4>
                                                            <button onClick={(e) => handleDeleteProject(proj.id, e)} class="text-slate-500 hover:text-rose-500 p-1 rounded opacity-0 group-hover:opacity-100 transition-all">
                                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                                            </button>
                                                        </div>
                                                        <p class="text-xs text-slate-400 line-clamp-2">{proj.description}</p>
                                                    </div>
                                                    <div class="mt-6 space-y-1.5">
                                                        <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                                                            <div class={'h-full ' + theme.solid + ' transition-all duration-500'} style={{ width: progressPercent + '%' }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div class="space-y-6">
                                <button onClick={() => setActiveProjectId(null)} class="text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg transition-all">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                                    Zurück
                                </button>

                                <div class="bg-gradient-to-r from-hub-card to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl relative">
                                    <div class="flex items-center gap-3">
                                        <div class={'w-3.5 h-3.5 rounded-full ' + (COLOR_THEMES[activeProject.color]?.solid || 'bg-blue-500')}></div>
                                        <input type="text" value={activeProject.name} onChange={(e) => {
                                            const updated = projects.map(p => p.id === activeProject.id ? { ...p, name: e.target.value } : p);
                                            setProjects(updated); saveProjectToDb({ ...activeProject, name: e.target.value });
                                        }} class="bg-transparent font-extrabold text-2xl text-white border-b border-transparent hover:border-slate-700 focus:border-blue-500 focus:outline-none w-full" />
                                    </div>
                                </div>

                                <div class="relative border-l-2 border-slate-800 ml-4 pl-6 sm:pl-8 space-y-8 mt-10">
                                    {activeProject.phases.map((phase) => (
                                        <div key={phase.id} class="relative group">
                                            <div class="absolute -left-[33px] sm:-left-[41px] top-1.5 w-4 h-4 rounded-full border-2 border-blue-500 bg-hub-dark flex items-center justify-center"><div class="w-1.5 h-1.5 bg-blue-500 rounded-full"></div></div>
                                            <div class="flex items-center justify-between mb-4">
                                                <input type="text" value={phase.title} onChange={(e) => handleUpdatePhaseTitle(activeProject.id, phase.id, e.target.value)} class="bg-transparent font-bold text-slate-200 text-base border-b border-transparent focus:border-blue-500 focus:outline-none" />
                                                <button onClick={() => handleDeletePhase(activeProject.id, phase.id)} class="text-slate-500 hover:text-rose-500"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                                            </div>

                                            <ul class="space-y-2">
                                                {phase.goals.map((goal) => (
                                                    <li key={goal.id} class={'flex items-center justify-between p-3 rounded-xl border ' + (goal.completed ? 'bg-slate-950/40 border-slate-950/60 text-slate-500' : 'bg-hub-card border-slate-800/80 text-slate-200')}>
                                                        <div class="flex items-center gap-3 flex-1">
                                                            <input type="checkbox" checked={goal.completed} onChange={() => handleToggleGoal(activeProject.id, phase.id, goal.id)} class={'w-4.5 h-4.5 text-blue-600 bg-slate-950 focus:ring-0 cursor-pointer ' + (goal.continuous ? 'rounded-full border-2 border-blue-500' : 'rounded')} />
                                                            <input type="text" value={goal.text} onChange={(e) => handleUpdateGoalText(activeProject.id, phase.id, goal.id, e.target.value)} class={'bg-transparent focus:outline-none text-xs sm:text-sm flex-1 ' + (goal.completed ? 'line-through' : '')} />
                                                            {goal.continuous && <span class="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded-full shrink-0">🔄 Fortlaufend</span>}
                                                        </div>
                                                        <button onClick={() => handleDeleteGoal(activeProject.id, phase.id, goal.id)} class="text-slate-600 hover:text-rose-500"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                                                    </li>
                                                ))}
                                            </ul>
                                            <PhaseGoalForm onAddGoal={(text, isContinuous) => handleAddGoal(activeProject.id, phase.id, text, isContinuous)} />
                                        </div>
                                    ))}
                                </div>

                                <button onClick={() => { const name = prompt("Name des Abschnitts?"); if (name) handleAddPhase(activeProject.id, name); }} class="w-full py-3.5 border-2 border-dashed border-slate-800 bg-hub-card/20 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center justify-center gap-2 transition-all">
                                    <span>Abschnitt (Stunde/Woche/Monat) hinzufügen</span>
                                </button>
                            </div>
                        )}
                    </main>

                    {isNewProjectModalOpen && (
                        <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <form onSubmit={handleCreateProject} class="bg-hub-card border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
                                <h3 class="text-lg font-bold">Neues Projekt anlegen</h3>
                                <input type="text" placeholder="z.B. 🧬 Bioengineering" value={newProjName} onChange={(e) => setNewProjName(e.target.value)} class="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100" required />
                                <textarea placeholder="Beschreibung..." value={newProjDesc} onChange={(e) => setNewProjDesc(e.target.value)} class="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 resize-none" />
                                <div class="flex gap-2">
                                    <button type="button" onClick={() => setIsNewProjectModalOpen(false)} class="flex-1 py-2 bg-slate-800 rounded-xl text-sm">Abbrechen</button>
                                    <button type="submit" class="flex-1 py-2 bg-blue-600 rounded-xl text-sm font-semibold">Erstellen</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {toast.show && (
                        <div class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm z-50">
                            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                            <span>{toast.message}</span>
                        </div>
                    )}
                </div>
            );
        }

        function PhaseGoalForm({ onAddGoal }) {
            const [text, setText] = useState('');
            const [isContinuous, setIsContinuous] = useState(false);
            return (
                <form onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; onAddGoal(text, isContinuous); setText(''); setIsContinuous(false); }} class="mt-4 flex gap-2">
                    <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Schritt hinzufügen..." class="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none" />
                    <select value={isContinuous ? 'continuous' : 'once'} onChange={(e) => setIsContinuous(e.target.value === 'continuous')} class="bg-slate-900 border border-slate-800 rounded-lg px-2 text-xs text-slate-400">
                        <option value="once">Einmalig</option>
                        <option value="continuous">Fortlaufend</option>
                    </select>
                    <button type="submit" class="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg">Add</button>
                </form>
            );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
    </script>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log(`Mission Control Hub läuft auf Port ${PORT}`);
});
