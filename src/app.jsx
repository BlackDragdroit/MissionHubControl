const { useState, useEffect } = React;

        // Pro-Projekt Farbidentität (Hex + RGB-Triplet für weiche Flächen/Glows)
        const COLOR_THEMES = {
            blue:    { hex:'#6c9bff', rgb:'108,155,255', name:'Blau' },
            purple:  { hex:'#a78bfa', rgb:'167,139,250', name:'Violett' },
            emerald: { hex:'#34d399', rgb:'52,211,153',  name:'Smaragd' },
            rose:    { hex:'#fb7185', rgb:'251,113,133',  name:'Rosé' },
            amber:   { hex:'#fbbf24', rgb:'251,191,36',   name:'Bernstein' },
            cyan:    { hex:'#22d3ee', rgb:'34,211,238',   name:'Cyan' }
        };
        const themeOf = (c) => COLOR_THEMES[c] || COLOR_THEMES.blue;

        // Kleine Icons (inline SVG) für ein konsistentes Strichbild
        const Icon = ({ d, className }) => (
            <svg className={className || 'w-4 h-4'} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
            </svg>
        );
        const ICONS = {
            plus: 'M12 5v14M5 12h14',
            trash: ['M4 7h16', 'M10 11v6M14 11v6', 'M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13', 'M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2'],
            back: 'M15 18l-6-6 6-6',
            close: 'M6 6l12 12M18 6L6 18',
            exportIcon: ['M12 3v12', 'M8 7l4-4 4 4', 'M5 15v4a2 2 0 002 2h10a2 2 0 002-2v-4'],
            importIcon: ['M12 15V3', 'M8 11l4 4 4-4', 'M5 15v4a2 2 0 002 2h10a2 2 0 002-2v-4']
        };

        function App() {
            const [projects, setProjects] = useState([]);
            const [activeProjectId, setActiveProjectId] = useState(null);
            const [toast, setToast] = useState({ show: false, message: '' });
            const [loading, setLoading] = useState(true);

            const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
            const [isNewPhaseModalOpen, setIsNewPhaseModalOpen] = useState(false);
            const [isImportModalOpen, setIsImportModalOpen] = useState(false);
            const [insertIndex, setInsertIndex] = useState(null);

            const [newProjName, setNewProjName] = useState('');
            const [newProjDesc, setNewProjDesc] = useState('');
            const [newProjColor, setNewProjColor] = useState('blue');
            const [newPhaseTitle, setNewPhaseTitle] = useState('');
            const [importJsonText, setImportJsonText] = useState('');

            const [draggedGoalId, setDraggedGoalId] = useState(null);
            const [sourcePhaseId, setSourcePhaseId] = useState(null);

            useEffect(() => {
                fetch('/api/projects')
                    .then(res => res.json())
                    .then(data => { setProjects(data); setLoading(false); })
                    .catch(err => { console.error(err); setLoading(false); });
            }, []);

            const saveProjectToDb = (updatedProj) => {
                fetch('/api/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedProj)
                })
                .then(() => showNotification("Cloud synchronisiert"))
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
                setNewProjColor('blue');
                saveProjectToDb(newProject);
            };

            const handleDeleteProject = (projId, e) => {
                e.stopPropagation();
                if (confirm("Projekt wirklich aus der Datenbank löschen?")) {
                    setProjects(projects.filter(p => p.id !== projId));
                    fetch('/api/projects/' + projId, { method: 'DELETE' })
                        .then(() => showNotification("Projekt gelöscht"))
                        .catch(err => console.error(err));
                }
            };

            const handleCreatePhaseSubmit = (e) => {
                e.preventDefault();
                if (!newPhaseTitle.trim() || !activeProjectId) return;

                let targetProj = null;
                const newPhaseObj = { id: 'phase-' + Date.now(), title: newPhaseTitle.trim(), goals: [] };

                const updated = projects.map(proj => {
                    if (proj.id === activeProjectId) {
                        let updatedPhases = [...proj.phases];
                        if (insertIndex !== null) {
                            updatedPhases.splice(insertIndex, 0, newPhaseObj);
                        } else {
                            updatedPhases.push(newPhaseObj);
                        }
                        targetProj = { ...proj, phases: updatedPhases };
                        return targetProj;
                    }
                    return proj;
                });
                setProjects(updated);
                setIsNewPhaseModalOpen(false);
                setNewPhaseTitle('');
                setInsertIndex(null);
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

            // --- DRAG AND DROP HANDLERS ---
            const onGoalDragStart = (goalId, currentPhaseId) => {
                setDraggedGoalId(goalId);
                setSourcePhaseId(currentPhaseId);
            };

            const onGoalDropHandler = (targetPhaseId, targetGoalId = null) => {
                if (!draggedGoalId || !activeProjectId) return;

                let targetProj = null;
                const updated = projects.map(proj => {
                    if (proj.id === activeProjectId) {
                        let matchedGoal = null;
                        proj.phases.forEach(p => {
                            if (p.id === sourcePhaseId) {
                                matchedGoal = p.goals.find(g => g.id === draggedGoalId);
                            }
                        });

                        if (!matchedGoal) return proj;

                        let cleanPhases = proj.phases.map(p => {
                            if (p.id === sourcePhaseId) {
                                return { ...p, goals: p.goals.filter(g => g.id !== draggedGoalId) };
                            }
                            return p;
                        });

                        cleanPhases = cleanPhases.map(p => {
                            if (p.id === targetPhaseId) {
                                let updatedGoals = [...p.goals];
                                if (targetGoalId) {
                                    const targetIdx = updatedGoals.findIndex(g => g.id === targetGoalId);
                                    updatedGoals.splice(targetIdx, 0, matchedGoal);
                                } else {
                                    updatedGoals.push(matchedGoal);
                                }
                                return { ...p, goals: updatedGoals };
                            }
                            return p;
                        });

                        targetProj = { ...proj, phases: cleanPhases };
                        return targetProj;
                    }
                    return proj;
                });

                setProjects(updated);
                setDraggedGoalId(null);
                setSourcePhaseId(null);
                if (targetProj) saveProjectToDb(targetProj);
            };

            // --- IMPORT & EXPORT OPERATIVE LOGIK ---
            const handleExportJson = () => {
                if (!activeProject) return;
                const exportData = {
                    name: activeProject.name,
                    description: activeProject.description,
                    color: activeProject.color,
                    phases: activeProject.phases.map(p => ({
                        title: p.title,
                        goals: p.goals.map(g => ({
                            text: g.text,
                            completed: g.completed,
                            continuous: g.continuous || false
                        }))
                    }))
                };

                const jsonString = JSON.stringify(exportData, null, 2);
                navigator.clipboard.writeText(jsonString)
                    .then(() => showNotification("JSON in Zwischenablage kopiert"))
                    .catch(() => showNotification("Kopieren fehlgeschlagen"));
            };

            const handleImportJsonSubmit = (e) => {
                e.preventDefault();
                if (!importJsonText.trim() || !activeProjectId) return;

                try {
                    const parsed = JSON.parse(importJsonText.trim());
                    if (!parsed.phases || !Array.isArray(parsed.phases)) {
                        throw new Error("Ungueltiges Format: 'phases' Array fehlt.");
                    }

                    const formattedPhases = parsed.phases.map((p, pIdx) => ({
                        id: 'phase-' + (Date.now() + pIdx),
                        title: p.title || 'Unbenannter Abschnitt',
                        goals: Array.isArray(p.goals) ? p.goals.map((g, gIdx) => ({
                            id: 'goal-' + (Date.now() + pIdx + gIdx + Math.random()),
                            text: g.text || '',
                            completed: !!g.completed,
                            continuous: !!g.continuous
                        })) : []
                    }));

                    let targetProj = null;
                    const updated = projects.map(proj => {
                        if (proj.id === activeProjectId) {
                            targetProj = {
                                ...proj,
                                name: parsed.name || proj.name,
                                description: parsed.description || proj.description,
                                color: parsed.color || proj.color,
                                phases: formattedPhases
                            };
                            return targetProj;
                        }
                        return proj;
                    });

                    setProjects(updated);
                    setIsImportModalOpen(false);
                    setImportJsonText('');
                    if (targetProj) saveProjectToDb(targetProj);
                    showNotification("Plan erfolgreich importiert");
                } catch (err) {
                    alert("Fehler beim Parsen der JSON-Daten: " + err.message);
                }
            };

            const activeProject = projects.find(p => p.id === activeProjectId);

            return (
                <div className="flex flex-col min-h-screen">
                    {/* ---------- HEADER ---------- */}
                    <header className="glass sticky top-0 z-40 px-4 sm:px-6" style={{ paddingTop: 'max(0.85rem, env(safe-area-inset-top))', paddingBottom: '0.85rem' }}>
                        <div className="max-w-5xl mx-auto flex justify-between items-center gap-3">
                            <div className="flex items-center gap-3 cursor-pointer group min-w-0" onClick={() => setActiveProjectId(null)}>
                                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 transition-all group-hover:scale-105"
                                     style={{ background:'radial-gradient(120% 120% at 30% 20%, rgba(108,155,255,.22), rgba(34,211,238,.06))', border:'1px solid rgba(108,155,255,.30)', boxShadow:'0 8px 24px -10px rgba(108,155,255,.5)' }}>
                                    🛰️
                                </div>
                                <div className="min-w-0">
                                    <h1 className="font-display text-lg font-bold tracking-tight leading-none group-hover:text-hub-accent transition-colors truncate">Mission Control</h1>
                                    <p className="font-mono2 text-[10px] text-hub-faint uppercase tracking-[0.2em] mt-1">PostgreSQL · Live Sync</p>
                                </div>
                            </div>
                            {activeProjectId === null && (
                                <button onClick={() => setIsNewProjectModalOpen(true)}
                                    className="shrink-0 text-white text-xs sm:text-sm px-3.5 sm:px-4 py-2.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all active:scale-95 hover:brightness-110"
                                    style={{ background:'linear-gradient(180deg, #6c9bff, #4f7cf0)', boxShadow:'0 10px 24px -10px rgba(108,155,255,.7)' }}>
                                    <Icon d={ICONS.plus} className="w-4 h-4" />
                                    <span className="hidden sm:inline">Neues Projekt</span>
                                    <span className="sm:hidden">Projekt</span>
                                </button>
                            )}
                        </div>
                    </header>

                    <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-7 sm:py-10" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
                        {activeProjectId === null ? (
                            /* ============ DASHBOARD ============ */
                            <div className="space-y-8 anim-fade">
                                <section className="relative overflow-hidden rounded-3xl p-6 sm:p-9 glass">
                                    <div className="absolute -right-20 -top-24 w-72 h-72 rounded-full blur-3xl" style={{ background:'rgba(108,155,255,.16)' }}></div>
                                    <div className="absolute -left-16 -bottom-24 w-64 h-64 rounded-full blur-3xl" style={{ background:'rgba(34,211,238,.10)' }}></div>
                                    <p className="font-mono2 text-[11px] uppercase tracking-[0.28em] text-hub-accent relative z-10">Kontrollzentrum</p>
                                    <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white mt-2 relative z-10 leading-[1.1]">Alle Vorhaben.<br className="hidden sm:block"/> Eine Flugbahn.</h2>
                                    <p className="text-sm text-hub-muted max-w-md mt-3 relative z-10 leading-relaxed">Zeitachsen, Phasen und Ziele — live in PostgreSQL gesichert und auf jedem Gerät synchron.</p>
                                </section>

                                <section className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-mono2 text-[11px] font-medium uppercase tracking-[0.2em] text-hub-faint">Projekte · {projects.length}</h3>
                                    </div>

                                    {loading ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {[0,1].map(i => (
                                                <div key={i} className="glass rounded-2xl p-5 h-36 animate-pulse" style={{ opacity:.5 }}></div>
                                            ))}
                                        </div>
                                    ) : projects.length === 0 ? (
                                        <div className="glass rounded-3xl px-6 py-14 text-center flex flex-col items-center">
                                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4" style={{ background:'rgba(108,155,255,.10)', border:'1px solid rgba(108,155,255,.25)' }}>🛰️</div>
                                            <h4 className="font-display text-lg font-bold text-white">Noch keine Mission gestartet</h4>
                                            <p className="text-sm text-hub-muted mt-1 max-w-xs">Lege dein erstes Projekt an und baue eine Zeitachse aus Phasen und Zielen.</p>
                                            <button onClick={() => setIsNewProjectModalOpen(true)} className="mt-5 text-white text-sm px-4 py-2.5 rounded-xl font-semibold flex items-center gap-1.5 active:scale-95 transition-all" style={{ background:'linear-gradient(180deg, #6c9bff, #4f7cf0)', boxShadow:'0 10px 24px -10px rgba(108,155,255,.7)' }}>
                                                <Icon d={ICONS.plus} className="w-4 h-4" /> Erstes Projekt anlegen
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {projects.map(proj => {
                                                const t = themeOf(proj.color);
                                                let totalGoals = 0, completedGoals = 0;
                                                proj.phases.forEach(p => p.goals.forEach(g => { totalGoals++; if (g.completed) completedGoals++; }));
                                                const progressPercent = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

                                                return (
                                                    <div key={proj.id} onClick={() => setActiveProjectId(proj.id)}
                                                        className="group glass rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-0.5 relative overflow-hidden"
                                                        style={{ borderColor:'var(--line)' }}>
                                                        <div className="absolute left-0 top-0 h-full w-1" style={{ background:'linear-gradient(180deg, ' + t.hex + ', transparent)' }}></div>
                                                        <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background:'rgba(' + t.rgb + ',.16)' }}></div>

                                                        <div className="relative">
                                                            <div className="flex justify-between items-start gap-3">
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background:t.hex, boxShadow:'0 0 10px ' + t.hex }}></span>
                                                                    <h4 className="font-display text-lg font-bold text-slate-100 truncate group-hover:text-white transition-colors">{proj.name}</h4>
                                                                </div>
                                                                <button onClick={(e) => handleDeleteProject(proj.id, e)} className="text-hub-faint hover:text-rose-400 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all -mr-1 -mt-1">
                                                                    <Icon d={ICONS.trash} className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                            <p className="text-xs text-hub-muted mt-1.5 line-clamp-2 leading-relaxed pr-2">{proj.description}</p>

                                                            <div className="mt-5 flex items-center justify-between gap-3">
                                                                <div className="font-mono2 text-[10px] text-hub-faint uppercase tracking-wider">
                                                                    {proj.phases.length} Phasen · {completedGoals}/{totalGoals} Ziele
                                                                </div>
                                                                <div className="font-mono2 text-xs font-medium tabular-nums" style={{ color:t.hex }}>{progressPercent}%</div>
                                                            </div>
                                                            <div className="mt-2 w-full rounded-full h-1.5 overflow-hidden" style={{ background:'rgba(255,255,255,.05)' }}>
                                                                <div className="h-full rounded-full transition-all duration-700" style={{ width: progressPercent + '%', background:'linear-gradient(90deg, ' + t.hex + ', rgba(' + t.rgb + ',.55))' }}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </section>
                            </div>
                        ) : (
                            /* ============ PROJEKT-DETAIL ============ */
                            <div className="space-y-6 anim-fade">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <button onClick={() => setActiveProjectId(null)} className="self-start glass text-hub-muted hover:text-white text-xs font-semibold flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-95">
                                        <Icon d={ICONS.back} className="w-4 h-4" /> Übersicht
                                    </button>

                                    <div className="flex gap-2">
                                        <button onClick={handleExportJson} className="flex-1 sm:flex-none glass text-hub-muted hover:text-white text-xs font-medium px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95">
                                            <Icon d={ICONS.exportIcon} className="w-3.5 h-3.5" /> Exportieren
                                        </button>
                                        <button onClick={() => setIsImportModalOpen(true)} className="flex-1 sm:flex-none text-xs font-medium px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95"
                                            style={{ color:'#a7c1ff', background:'rgba(108,155,255,.10)', border:'1px solid rgba(108,155,255,.28)' }}>
                                            <Icon d={ICONS.importIcon} className="w-3.5 h-3.5" /> Importieren
                                        </button>
                                    </div>
                                </div>

                                {/* Projekt-Kopf */}
                                <div className="glass rounded-2xl p-5 sm:p-6 relative overflow-hidden">
                                    <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full blur-3xl" style={{ background:'rgba(' + themeOf(activeProject.color).rgb + ',.14)' }}></div>
                                    <div className="flex items-center gap-3 relative">
                                        <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background:themeOf(activeProject.color).hex, boxShadow:'0 0 12px ' + themeOf(activeProject.color).hex }}></span>
                                        <input type="text" value={activeProject.name} onChange={(e) => {
                                            const updated = projects.map(p => p.id === activeProject.id ? { ...p, name: e.target.value } : p);
                                            setProjects(updated); saveProjectToDb({ ...activeProject, name: e.target.value });
                                        }} className="ghost-input font-display font-bold text-2xl sm:text-3xl text-white w-full" />
                                    </div>
                                    <p className="text-sm text-hub-muted mt-2 relative leading-relaxed">{activeProject.description}</p>
                                </div>

                                {/* ---------- ZEITACHSE (Signature) ---------- */}
                                <div className="relative pl-9 sm:pl-12 mt-8">
                                    {/* Schiene */}
                                    <div className="absolute top-0 bottom-0 w-px -translate-x-1/2" style={{ left:'11px', background:'linear-gradient(180deg, rgba(108,155,255,.5), rgba(34,211,238,.18) 40%, var(--line))' }}></div>
                                    <div className="hidden sm:block absolute top-0 bottom-0 w-px -translate-x-1/2" style={{ left:'15px', background:'linear-gradient(180deg, rgba(108,155,255,.5), rgba(34,211,238,.18) 40%, var(--line))' }}></div>

                                    <div className="space-y-2">
                                        {activeProject.phases.map((phase, idx) => {
                                            const t = themeOf(activeProject.color);
                                            const done = phase.goals.filter(g => g.completed).length;
                                            const all = phase.goals.length;
                                            const phaseComplete = all > 0 && done === all;
                                            return (
                                                <React.Fragment key={phase.id}>
                                                    {idx > 0 && (
                                                        <div className="relative h-6 group/ins">
                                                            <button
                                                                onClick={() => { setInsertIndex(idx); setIsNewPhaseModalOpen(true); }}
                                                                type="button"
                                                                title="Abschnitt hier einfügen"
                                                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold opacity-0 group-hover/ins:opacity-100 focus:opacity-100 transition-all hover:scale-110"
                                                                style={{ left:'11px', background:'var(--card)', border:'1px solid var(--line)', color:'var(--accent)' }}
                                                            >+</button>
                                                            <div className="sm:hidden"></div>
                                                            <button
                                                                onClick={() => { setInsertIndex(idx); setIsNewPhaseModalOpen(true); }}
                                                                type="button"
                                                                title="Abschnitt hier einfügen"
                                                                className="hidden sm:flex absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full items-center justify-center text-sm font-bold opacity-0 group-hover/ins:opacity-100 focus:opacity-100 transition-all hover:scale-110"
                                                                style={{ left:'15px', background:'var(--card)', border:'1px solid var(--line)', color:'var(--accent)' }}
                                                            >+</button>
                                                        </div>
                                                    )}

                                                    <div
                                                        className="relative group pb-5 rounded-2xl transition-all"
                                                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-zone-active'); }}
                                                        onDragLeave={(e) => e.currentTarget.classList.remove('drag-zone-active')}
                                                        onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('drag-zone-active'); onGoalDropHandler(phase.id); }}
                                                    >
                                                        {/* Knoten */}
                                                        <span className="absolute top-1 -translate-x-1/2 w-[15px] h-[15px] rounded-full flex items-center justify-center" style={{ left:'11px', background:'var(--base)', border:'2px solid ' + t.hex, boxShadow: phaseComplete ? '0 0 12px ' + t.hex : '0 0 0 4px rgba(' + t.rgb + ',.08)' }}>
                                                            {phaseComplete && <span className="w-1.5 h-1.5 rounded-full" style={{ background:t.hex }}></span>}
                                                        </span>
                                                        <span className="hidden sm:flex absolute top-1 -translate-x-1/2 w-[15px] h-[15px] rounded-full items-center justify-center" style={{ left:'15px', background:'var(--base)', border:'2px solid ' + t.hex, boxShadow: phaseComplete ? '0 0 12px ' + t.hex : '0 0 0 4px rgba(' + t.rgb + ',.08)' }}>
                                                            {phaseComplete && <span className="w-1.5 h-1.5 rounded-full" style={{ background:t.hex }}></span>}
                                                        </span>

                                                        <div className="flex items-center justify-between gap-2 mb-3">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <input type="text" value={phase.title} onChange={(e) => handleUpdatePhaseTitle(activeProject.id, phase.id, e.target.value)} className="ghost-input font-display font-semibold text-slate-100 text-base min-w-0" />
                                                                {all > 0 && (
                                                                    <span className="font-mono2 text-[10px] px-2 py-0.5 rounded-full shrink-0 tabular-nums" style={{ color:t.hex, background:'rgba(' + t.rgb + ',.10)' }}>{done}/{all}</span>
                                                                )}
                                                            </div>
                                                            <button onClick={() => handleDeletePhase(activeProject.id, phase.id)} className="text-hub-faint hover:text-rose-400 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                                                <Icon d={ICONS.trash} className="w-4 h-4" />
                                                            </button>
                                                        </div>

                                                        <ul className="space-y-2 min-h-[8px]">
                                                            {phase.goals.map((goal) => (
                                                                <li
                                                                    key={goal.id}
                                                                    draggable
                                                                    onDragStart={() => onGoalDragStart(goal.id, phase.id)}
                                                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onGoalDropHandler(phase.id, goal.id); }}
                                                                    className={'group/goal flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing ' + (goal.completed ? 'bg-white/[0.015] border-white/[0.04]' : 'glass hover:border-hub-line')}
                                                                >
                                                                    <span className="text-hub-faint text-xs tracking-tighter select-none cursor-grab hidden sm:block">⋮⋮</span>
                                                                    <input type="checkbox" checked={goal.completed} onChange={() => handleToggleGoal(activeProject.id, phase.id, goal.id)} className={'chk ' + (goal.continuous ? 'cont' : '')} />
                                                                    <input type="text" value={goal.text} onChange={(e) => handleUpdateGoalText(activeProject.id, phase.id, goal.id, e.target.value)} className={'ghost-input text-xs sm:text-sm flex-1 min-w-0 ' + (goal.completed ? 'line-through text-hub-faint' : 'text-slate-200')} />
                                                                    {goal.continuous && <span className="font-mono2 text-[9px] px-1.5 py-0.5 rounded-full shrink-0" style={{ color:'#a7c1ff', background:'rgba(108,155,255,.10)' }}>🔄</span>}
                                                                    <button onClick={() => handleDeleteGoal(activeProject.id, phase.id, goal.id)} className="text-hub-faint hover:text-rose-400 shrink-0 opacity-0 group-hover/goal:opacity-100 transition-all">
                                                                        <Icon d={ICONS.close} className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                        <PhaseGoalForm accent={t.hex} onAddGoal={(text, isContinuous) => handleAddGoal(activeProject.id, phase.id, text, isContinuous)} />
                                                    </div>
                                                </React.Fragment>
                                            );
                                        })}

                                        {activeProject.phases.length === 0 && (
                                            <p className="text-sm text-hub-muted py-2">Noch keine Phasen. Füge unten den ersten Abschnitt deiner Zeitachse hinzu.</p>
                                        )}
                                    </div>
                                </div>

                                <button onClick={() => { setInsertIndex(null); setIsNewPhaseModalOpen(true); }} className="w-full py-3.5 rounded-2xl text-xs font-semibold text-hub-muted hover:text-white flex items-center justify-center gap-2 transition-all" style={{ border:'1.5px dashed var(--line)' }}>
                                    <Icon d={ICONS.plus} className="w-4 h-4" /> Abschnitt am Ende hinzufügen
                                </button>
                            </div>
                        )}
                    </main>

                    {/* ---------- MODALS ---------- */}
                    {isNewProjectModalOpen && (
                        <ModalShell onClose={() => setIsNewProjectModalOpen(false)}>
                            <form onSubmit={handleCreateProject} className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-display text-lg font-bold text-white">Neues Projekt</h3>
                                    <CloseBtn onClick={() => setIsNewProjectModalOpen(false)} />
                                </div>
                                <input type="text" placeholder="z. B. 🧬 Bioengineering" value={newProjName} onChange={(e) => setNewProjName(e.target.value)} className="field w-full p-3 text-slate-100 text-sm" required autoFocus />
                                <textarea placeholder="Kurze Beschreibung (optional)" value={newProjDesc} onChange={(e) => setNewProjDesc(e.target.value)} className="field w-full p-3 text-slate-100 text-sm resize-none h-20" />
                                <div>
                                    <p className="font-mono2 text-[10px] uppercase tracking-[0.18em] text-hub-faint mb-2.5">Farbe</p>
                                    <div className="flex gap-2.5 flex-wrap">
                                        {Object.keys(COLOR_THEMES).map(key => (
                                            <button type="button" key={key} onClick={() => setNewProjColor(key)} title={COLOR_THEMES[key].name}
                                                className={'w-8 h-8 rounded-full transition-all ' + (newProjColor === key ? 'scale-110' : 'opacity-60 hover:opacity-100')}
                                                style={{ background: COLOR_THEMES[key].hex, boxShadow: newProjColor === key ? '0 0 0 2px var(--card), 0 0 0 4px ' + COLOR_THEMES[key].hex : 'none' }} />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <button type="button" onClick={() => setIsNewProjectModalOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-hub-muted hover:text-white transition-all" style={{ background:'rgba(255,255,255,.04)' }}>Abbrechen</button>
                                    <button type="submit" className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95" style={{ background:'linear-gradient(180deg, #6c9bff, #4f7cf0)' }}>Erstellen</button>
                                </div>
                            </form>
                        </ModalShell>
                    )}

                    {isNewPhaseModalOpen && (
                        <ModalShell onClose={() => { setIsNewPhaseModalOpen(false); setNewPhaseTitle(''); setInsertIndex(null); }}>
                            <form onSubmit={handleCreatePhaseSubmit} className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-display text-lg font-bold text-white">
                                        {insertIndex !== null ? 'Abschnitt einschieben' : 'Neuer Zeitabschnitt'}
                                    </h3>
                                    <CloseBtn onClick={() => { setIsNewPhaseModalOpen(false); setNewPhaseTitle(''); setInsertIndex(null); }} />
                                </div>
                                <p className="text-xs text-hub-muted -mt-1">Benenne den Abschnitt frei — etwa „Semester 3", „Woche 12" oder „Montag".</p>
                                <input type="text" placeholder="Name des Abschnitts" value={newPhaseTitle} onChange={(e) => setNewPhaseTitle(e.target.value)} className="field w-full p-3 text-slate-100 text-sm" required autoFocus />
                                <div className="flex gap-2 pt-1">
                                    <button type="button" onClick={() => { setIsNewPhaseModalOpen(false); setNewPhaseTitle(''); setInsertIndex(null); }} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-hub-muted hover:text-white transition-all" style={{ background:'rgba(255,255,255,.04)' }}>Abbrechen</button>
                                    <button type="submit" className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95" style={{ background:'linear-gradient(180deg, #6c9bff, #4f7cf0)' }}>Hinzufügen</button>
                                </div>
                            </form>
                        </ModalShell>
                    )}

                    {isImportModalOpen && (
                        <ModalShell wide onClose={() => { setIsImportModalOpen(false); setImportJsonText(''); }}>
                            <form onSubmit={handleImportJsonSubmit} className="space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="font-display text-lg font-bold text-white">Fahrplan importieren</h3>
                                        <p className="text-xs text-hub-muted mt-0.5">Füge generierten JSON-Code ein. Der aktuelle Plan wird überschrieben.</p>
                                    </div>
                                    <CloseBtn onClick={() => { setIsImportModalOpen(false); setImportJsonText(''); }} />
                                </div>
                                <textarea
                                    placeholder='{ "name": "🧬 Oxford Track", "phases": [ { "title": "Semester 3", "goals": [{ "text": "Notenschnitt <= 1.5", "completed": false, "continuous": true }] } ] }'
                                    value={importJsonText}
                                    onChange={(e) => setImportJsonText(e.target.value)}
                                    className="field w-full p-3 text-slate-200 text-xs font-mono2 h-56 sm:h-64 resize-none"
                                    required autoFocus
                                />
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => { setIsImportModalOpen(false); setImportJsonText(''); }} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-hub-muted hover:text-white transition-all" style={{ background:'rgba(255,255,255,.04)' }}>Abbrechen</button>
                                    <button type="submit" className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95" style={{ background:'linear-gradient(180deg, #6c9bff, #4f7cf0)' }}>Importieren &amp; Speichern</button>
                                </div>
                            </form>
                        </ModalShell>
                    )}

                    {/* ---------- TOAST ---------- */}
                    {toast.show && (
                        <div className="fixed left-1/2 -translate-x-1/2 z-50 glass px-4 py-3 rounded-2xl flex items-center gap-2.5 text-sm shadow-2xl anim-sheet" style={{ bottom:'max(1.5rem, env(safe-area-inset-bottom))' }}>
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                            </span>
                            <span className="text-slate-100">{toast.message}</span>
                        </div>
                    )}
                </div>
            );
        }

        // Wiederverwendbare Modal-Hülle: Desktop = zentriert, Mobile = Bottom-Sheet
        function ModalShell({ children, onClose, wide }) {
            return (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 anim-fade" style={{ background:'rgba(3,6,12,.72)', backdropFilter:'blur(6px)' }} onClick={onClose}>
                    <div onClick={(e) => e.stopPropagation()}
                         className={'glass w-full ' + (wide ? 'sm:max-w-xl' : 'sm:max-w-md') + ' p-5 sm:p-6 anim-sheet sm:anim-pop'}
                         style={{ borderRadius:'24px 24px 0 0', borderBottomLeftRadius:0, borderBottomRightRadius:0, paddingBottom:'max(1.25rem, env(safe-area-inset-bottom))' }}>
                        <div className="sm:hidden mx-auto mb-3 h-1 w-10 rounded-full" style={{ background:'var(--line)' }}></div>
                        {children}
                    </div>
                </div>
            );
        }

        function CloseBtn({ onClick }) {
            return (
                <button type="button" onClick={onClick} className="text-hub-faint hover:text-white p-1.5 -mr-1.5 -mt-1 rounded-lg transition-all">
                    <Icon d={ICONS.close} className="w-4 h-4" />
                </button>
            );
        }

        function PhaseGoalForm({ onAddGoal, accent }) {
            const [text, setText] = useState('');
            const [isContinuous, setIsContinuous] = useState(false);
            return (
                <form onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; onAddGoal(text, isContinuous); setText(''); setIsContinuous(false); }} className="mt-3 flex gap-2 items-center">
                    <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Schritt hinzufügen…" className="field flex-1 min-w-0 px-3 py-2 text-xs text-slate-200" />
                    <select value={isContinuous ? 'continuous' : 'once'} onChange={(e) => setIsContinuous(e.target.value === 'continuous')} className="field px-2 py-2 text-xs text-hub-muted shrink-0">
                        <option value="once">Einmalig</option>
                        <option value="continuous">Fortlaufend</option>
                    </select>
                    <button type="submit" className="shrink-0 text-white text-xs px-3 py-2 rounded-xl font-semibold transition-all active:scale-95" style={{ background: accent || '#6c9bff' }}>
                        <Icon d={ICONS.plus} className="w-4 h-4" />
                    </button>
                </form>
            );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
