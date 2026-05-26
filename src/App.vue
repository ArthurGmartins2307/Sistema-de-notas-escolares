<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

// Interface para definir a estrutura do Aluno
interface Aluno {
  id: number
  nome: string
  nascimento: string | null
  turma: string
  sexo: string | null
  matematica: number | string
  portugues: number | string
  historia: number | string
  geografia: number | string
  biologia: number | string
  quimica: number | string
  fisica: number | string
  sociologia: number | string
  filosofia: number | string
  artes: number | string
  educacao_fisica: number | string
  media: number | string
}

// Estados Reativos
const alunos = ref<Aluno[]>([])
const searchQuery = ref('')
const selectedAluno = ref<Aluno | null>(null)
const isEditingGrades = ref(false)
const showAddModal = ref(false)
const isSaving = ref(false)
const notification = ref<{ type: 'success' | 'error'; message: string } | null>(null)

// Cópia das notas para edição
const editedGrades = ref<Record<string, number>>({})

// Modelo para novo aluno
const newAluno = ref({
  nome: '',
  turma: '',
  nascimento: '',
  sexo: 'M'
})

// Mapeamento das Disciplinas
const subjects = [
  { key: 'matematica', label: 'Matemática' },
  { key: 'portugues', label: 'Português' },
  { key: 'historia', label: 'História' },
  { key: 'geografia', label: 'Geografia' },
  { key: 'biologia', label: 'Biologia' },
  { key: 'quimica', label: 'Química' },
  { key: 'fisica', label: 'Física' },
  { key: 'sociologia', label: 'Sociologia' },
  { key: 'filosofia', label: 'Filosofia' },
  { key: 'artes', label: 'Artes' },
  { key: 'educacao_fisica', label: 'Educação Física' }
]

// Carregar Alunos do Backend
const fetchAlunos = async () => {
  try {
    const response = await axios.get('http://localhost:3001/alunos')
    alunos.value = response.data
    
    // Se houver um aluno atualmente selecionado, atualizar seus dados em tempo real
    if (selectedAluno.value) {
      const updated = response.data.find((a: Aluno) => a.id === selectedAluno.value?.id)
      if (updated) {
        selectedAluno.value = updated
      }
    }
  } catch (error) {
    console.error('Erro ao carregar alunos:', error)
    showNotification('error', 'Não foi possível conectar ao servidor backend.')
  }
}

// Inicialização
onMounted(() => {
  fetchAlunos()
})

// Mostrar notificações flutuantes temporárias
const showNotification = (type: 'success' | 'error', message: string) => {
  notification.value = { type, message }
  setTimeout(() => {
    notification.value = null
  }, 4000)
}

// Filtro de Alunos na barra lateral
const filteredAlunos = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return alunos.value
  
  return alunos.value.filter(aluno => 
    aluno.nome.toLowerCase().includes(query) || 
    aluno.turma.toLowerCase().includes(query)
  )
})

// Selecionar um aluno para visualizar detalhes
const selectAluno = (aluno: Aluno) => {
  selectedAluno.value = aluno
  isEditingGrades.value = false
}

// Iniciar a edição de notas do aluno selecionado
const startEditGrades = () => {
  if (!selectedAluno.value) return
  
  // Copiar as notas atuais para o estado temporário de edição
  const grades: Record<string, number> = {}
  subjects.forEach(sub => {
    const originalValue = selectedAluno.value ? selectedAluno.value[sub.key as keyof Aluno] : 0
    grades[sub.key] = originalValue ? parseFloat(originalValue.toString()) : 0
  })
  
  editedGrades.value = grades
  isEditingGrades.value = true
}

// Cancelar a edição de notas
const cancelEditGrades = () => {
  isEditingGrades.value = false
}

// Salvar as notas editadas no banco de dados
const saveGrades = async () => {
  if (!selectedAluno.value) return
  
  // Validação preliminar das notas
  for (const sub of subjects) {
    const val = editedGrades.value[sub.key]
    if (val === undefined || val === null || isNaN(val) || val < 0 || val > 10) {
      showNotification('error', `A nota de ${sub.label} precisa estar entre 0.0 e 10.0.`)
      return
    }
  }

  isSaving.value = true
  try {
    await axios.put(`http://localhost:3001/alunos/${selectedAluno.value.id}/notas`, editedGrades.value)
    showNotification('success', 'Notas atualizadas com sucesso!')
    await fetchAlunos()
    isEditingGrades.value = false
  } catch (error) {
    console.error('Erro ao atualizar notas:', error)
    showNotification('error', 'Erro ao salvar notas no banco de dados.')
  } finally {
    isSaving.value = false
  }
}

// Excluir um aluno e suas notas
const deleteAluno = async () => {
  if (!selectedAluno.value) return
  
  const confirmDelete = confirm(`Tem certeza que deseja excluir o(a) aluno(a) ${selectedAluno.value.nome} e todas as suas notas?`)
  if (!confirmDelete) return

  isSaving.value = true
  try {
    await axios.delete(`http://localhost:3001/alunos/${selectedAluno.value.id}`)
    showNotification('success', 'Aluno removido com sucesso!')
    selectedAluno.value = null
    await fetchAlunos()
  } catch (error) {
    console.error('Erro ao deletar aluno:', error)
    showNotification('error', 'Não foi possível excluir o aluno do banco de dados.')
  } finally {
    isSaving.value = false
  }
}

// Adicionar um novo aluno
const addAluno = async () => {
  if (!newAluno.value.nome.trim()) {
    showNotification('error', 'Por favor, insira o nome do aluno.')
    return
  }
  if (!newAluno.value.turma.trim()) {
    showNotification('error', 'Por favor, insira a turma do aluno.')
    return
  }

  isSaving.value = true
  try {
    const response = await axios.post('http://localhost:3001/alunos', {
      nome: newAluno.value.nome.trim(),
      turma: newAluno.value.turma.trim().toUpperCase(),
      nascimento: newAluno.value.nascimento || null,
      sexo: newAluno.value.sexo
    })
    
    showNotification('success', 'Aluno cadastrado com sucesso!')
    await fetchAlunos()
    
    // Auto-selecionar o aluno recém-criado
    const createdAluno = alunos.value.find(a => a.id === response.data.id)
    if (createdAluno) {
      selectAluno(createdAluno)
    }
    
    // Resetar campos
    newAluno.value = {
      nome: '',
      turma: '',
      nascimento: '',
      sexo: 'M'
    }
    showAddModal.value = false
  } catch (error) {
    console.error('Erro ao adicionar aluno:', error)
    showNotification('error', 'Erro ao salvar aluno no banco de dados.')
  } finally {
    isSaving.value = false
  }
}

// Formatar data de nascimento para exibição (DD/MM/AAAA)
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'Não informada'
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

// Formatar valor de nota para exibição decimal (ex: 7.5 -> 7.50)
const formatGrade = (val: number | string | null | undefined) => {
  if (val === null || val === undefined || val === '') return '0.00'
  const num = parseFloat(val.toString())
  return isNaN(num) ? '0.00' : num.toFixed(2)
}
</script>

<template>
  <div class="dashboard-container">
    <!-- Barra Lateral (Sidebar): Lista de Alunos -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="app-logo">
          <!-- Ícone Acadêmico em SVG -->
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 14v7" />
          </svg>
          <span class="app-name">EduGrade</span>
        </div>
        <p class="subtitle">Controle Escolar</p>
      </div>

      <div class="sidebar-actions">
        <!-- Campo de Pesquisa Dinâmico -->
        <div class="search-box-wrapper">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Buscar por nome ou turma..." 
            class="search-input"
          />
          <svg class="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        <!-- Botão Adicionar Aluno -->
        <button class="btn-primary add-student-btn" @click="showAddModal = true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Adicionar Aluno
        </button>
      </div>

      <!-- Lista de Alunos Integrada -->
      <div class="student-list-wrapper">
        <div v-if="filteredAlunos.length === 0" class="no-results">
          Nenhum aluno encontrado
        </div>
        <div 
          v-for="aluno in filteredAlunos" 
          :key="aluno.id"
          class="student-card"
          :class="{ active: selectedAluno && selectedAluno.id === aluno.id }"
          @click="selectAluno(aluno)"
        >
          <div class="student-card-info">
            <h3 class="student-card-name">{{ aluno.nome }}</h3>
            <div class="student-card-meta">
              <span class="student-class-badge">Turma {{ aluno.turma }}</span>
              <span class="student-gender-badge">
                Sexo: {{ aluno.sexo === 'M' ? 'Masc' : 'Fem' }}
              </span>
            </div>
          </div>
          <!-- Badge da Média Geral -->
          <div 
            class="student-media-badge"
            :class="parseFloat(aluno.media?.toString() || '0') >= 7 ? 'media-pass' : 'media-fail'"
          >
            {{ formatGrade(aluno.media) }}
          </div>
        </div>
      </div>
    </aside>

    <!-- Área de Detalhes Principal -->
    <main class="main-content-panel">
      <!-- Exibição de Notificações Temporárias -->
      <div v-if="notification" class="notification-toast" :class="notification.type">
        <span>{{ notification.message }}</span>
      </div>

      <!-- Estado Vazio: Nenhum Aluno Selecionado -->
      <div v-if="!selectedAluno" class="empty-state-container flex-center">
        <div class="empty-state-content">
          <div class="empty-illustration">
            <svg viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h2>EduGrade Dashboard</h2>
          <p>Selecione um aluno na barra lateral para gerenciar suas notas escolares, visualizar sua média de aprovação e sincronizar informações com o banco de dados.</p>
        </div>
      </div>

      <!-- Painel Detalhado do Aluno Ativo -->
      <div v-else class="student-details-wrapper">
        <!-- Cabeçalho de Dados do Aluno -->
        <header class="detail-header">
          <div class="student-profile-summary">
            <div class="avatar-circle">
              {{ selectedAluno.nome.charAt(0).toUpperCase() }}
            </div>
            <div>
              <h1 class="student-name-title">{{ selectedAluno.nome }}</h1>
              <div class="student-meta-row">
                <span class="info-tag">
                  <strong>Turma:</strong> {{ selectedAluno.turma }}
                </span>
                <span class="info-tag">
                  <strong>Gênero:</strong> {{ selectedAluno.sexo === 'M' ? 'Masculino' : 'Feminino' }}
                </span>
                <span class="info-tag">
                  <strong>Nascimento:</strong> {{ formatDate(selectedAluno.nascimento) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Ações da Ficha Cadastral -->
          <div class="detail-header-actions" v-if="!isEditingGrades">
            <button class="btn-secondary" @click="startEditGrades">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Editar Notas
            </button>
            <button class="btn-secondary btn-danger-text" @click="deleteAluno">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              Excluir Aluno
            </button>
          </div>
        </header>

        <!-- Caixa de Status Condicional (Aprovado / Reprovado) -->
        <section 
          class="status-outcome-card"
          :class="parseFloat(selectedAluno.media?.toString() || '0') >= 7 ? 'status-pass' : 'status-fail'"
        >
          <div class="status-content">
            <div class="status-icon-glow">
              <!-- Ícone Check (Aprovado) -->
              <svg v-if="parseFloat(selectedAluno.media?.toString() || '0') >= 7" viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <!-- Ícone Cruz/Alerta (Reprovado) -->
              <svg v-else viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <div>
              <h2 class="status-title">
                {{ parseFloat(selectedAluno.media?.toString() || '0') >= 7 ? 'Passou!' : 'Reprovou' }}
              </h2>
              <p class="status-description">
                Este(a) aluno(a) obteve uma média final consolidada de <strong>{{ formatGrade(selectedAluno.media) }}</strong>. 
                {{ parseFloat(selectedAluno.media?.toString() || '0') >= 7 
                  ? 'Desempenho aprovado segundo os critérios escolares mínimos de nota 7.00.' 
                  : 'Desempenho insatisfatório. Fica retido para recuperação acadêmica por não atingir a nota mínima 7.00.' 
                }}
              </p>
            </div>
          </div>
        </section>

        <!-- Seção Principal: Grade de Notas das 11 Disciplinas -->
        <section class="grades-section">
          <div class="section-title-bar">
            <h2>Notas Detalhadas por Disciplina</h2>
            <span class="badge-total-disciplines">11 Disciplinas Cadastradas</span>
          </div>

          <!-- MODO VISUALIZAÇÃO: Exibe as notas em cards com barras de progresso -->
          <div v-if="!isEditingGrades" class="grades-grid">
            <div 
              v-for="sub in subjects" 
              :key="sub.key" 
              class="grade-item-card"
            >
              <div class="grade-card-top">
                <span class="subject-name">{{ sub.label }}</span>
                <span 
                  class="subject-score"
                  :class="parseFloat(selectedAluno[sub.key as keyof Aluno]?.toString() || '0') >= 7 ? 'score-pass' : 'score-fail'"
                >
                  {{ formatGrade(selectedAluno[sub.key as keyof Aluno]) }}
                </span>
              </div>
              <!-- Barra de Progresso Visual da Nota -->
              <div class="progress-bar-track">
                <div 
                  class="progress-bar-fill"
                  :class="parseFloat(selectedAluno[sub.key as keyof Aluno]?.toString() || '0') >= 7 ? 'fill-pass' : 'fill-fail'"
                  :style="{ width: `${Math.min(100, Math.max(0, parseFloat(selectedAluno[sub.key as keyof Aluno]?.toString() || '0') * 10))}%` }"
                ></div>
              </div>
            </div>
          </div>

          <!-- MODO EDIÇÃO: Exibe campos input numéricos para as notas -->
          <div v-else class="grades-editing-form">
            <div class="grades-grid editing">
              <div 
                v-for="sub in subjects" 
                :key="sub.key" 
                class="grade-item-card edit-mode"
              >
                <div class="form-group edit-grade-group">
                  <label :for="'grade-' + sub.key">{{ sub.label }}</label>
                  <div class="input-grade-wrapper">
                    <input 
                      :id="'grade-' + sub.key"
                      v-model.number="editedGrades[sub.key]"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      class="grade-input"
                    />
                    <span class="max-value">/ 10</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Rodapé de Ações de Edição -->
            <div class="editing-actions-bar">
              <div class="editing-warning">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="warning-icon">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>As notas salvas recalcularão imediatamente a média e serão sincronizadas com o MySQL.</span>
              </div>
              <div class="action-buttons">
                <button class="btn-secondary" :disabled="isSaving" @click="cancelEditGrades">
                  Cancelar
                </button>
                <button class="btn-primary" :disabled="isSaving" @click="saveGrades">
                  <span v-if="isSaving">Salvando...</span>
                  <span v-else>Salvar Notas</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- Modal Modal-Backdrop: Adicionar Novo Aluno -->
    <div v-if="showAddModal" class="modal-backdrop" @click.self="showAddModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Cadastrar Novo Aluno</h2>
          <button class="btn-close" @click="showAddModal = false">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="addAluno">
          <!-- Nome do Aluno -->
          <div class="form-group">
            <label for="new-student-name">Nome Completo</label>
            <input 
              id="new-student-name"
              v-model="newAluno.nome"
              type="text"
              placeholder="Digite o nome completo"
              required
            />
          </div>

          <!-- Turma e Gênero -->
          <div class="form-row">
            <div class="form-group flex-1">
              <label for="new-student-class">Turma</label>
              <input 
                id="new-student-class"
                v-model="newAluno.turma"
                type="text"
                placeholder="Ex: 3B"
                required
              />
            </div>
            
            <div class="form-group flex-1">
              <label for="new-student-gender">Sexo</label>
              <select id="new-student-gender" v-model="newAluno.sexo">
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>
          </div>

          <!-- Data de Nascimento -->
          <div class="form-group">
            <label for="new-student-birth">Data de Nascimento</label>
            <input 
              id="new-student-birth"
              v-model="newAluno.nascimento"
              type="date"
            />
          </div>

          <!-- Botões do Modal -->
          <div class="modal-footer">
            <button type="button" class="btn-secondary" :disabled="isSaving" @click="showAddModal = false">
              Cancelar
            </button>
            <button type="submit" class="btn-primary" :disabled="isSaving">
              <span v-if="isSaving">Cadastrando...</span>
              <span v-else>Cadastrar Aluno</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Estilos Específicos do Painel de Dashboard */

/* Grid / Sidebar */
.sidebar {
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--glass-border);
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.sidebar-header {
  padding: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--primary);
}

.app-name {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.5px;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--text-muted);
  margin-top: 2px;
  font-weight: 600;
}

.sidebar-actions {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.search-box-wrapper {
  position: relative;
  width: 100%;
}

.search-input {
  width: 100%;
  padding-left: 38px;
  font-size: 13px;
  height: 38px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.add-student-btn {
  width: 100%;
  height: 38px;
}

/* Lista de Alunos */
.student-list-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.no-results {
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
  padding: 20px;
}

.student-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.student-card:hover {
  background: var(--card-hover-bg);
  border-color: var(--card-border-hover);
  transform: translateX(2px);
}

.student-card.active {
  background: rgba(99, 102, 241, 0.08);
  border-color: var(--primary);
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.15);
}

.student-card-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.student-card-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.student-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--text-secondary);
}

.student-class-badge {
  background: rgba(255, 255, 255, 0.06);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.student-media-badge {
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  min-width: 50px;
  text-align: center;
}

.media-pass {
  background: var(--success-bg);
  color: var(--success);
  border: 1px solid var(--success-border);
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.1);
}

.media-fail {
  background: var(--danger-bg);
  color: var(--danger);
  border: 1px solid var(--danger-border);
  box-shadow: 0 0 8px rgba(244, 63, 94, 0.1);
}

/* Painel de Conteúdo Principal */
.main-content-panel {
  flex: 1;
  height: 100vh;
  overflow-y: auto;
  position: relative;
  background-color: var(--bg-primary);
}

/* Estado Vazio */
.empty-state-container {
  height: 100%;
  padding: 40px;
}

.empty-state-content {
  text-align: center;
  max-width: 480px;
}

.empty-illustration {
  margin-bottom: 20px;
  color: var(--primary);
  opacity: 0.8;
  filter: drop-shadow(0 4px 12px var(--primary-glow));
  animation: float 4s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.empty-state-content h2 {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.empty-state-content p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* Painel de Detalhes do Aluno */
.student-details-wrapper {
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1024px;
  margin: 0 auto;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: 20px;
  gap: 16px;
}

@media (max-width: 768px) {
  .detail-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .detail-header-actions {
    width: 100%;
    justify-content: flex-start;
  }
}

.student-profile-summary {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--primary-gradient);
  color: white;
  font-size: 22px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-primary);
}

.student-name-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.student-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.info-tag {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 3px 8px;
  border-radius: 6px;
}

.info-tag strong {
  color: var(--text-primary);
  font-weight: 500;
}

.detail-header-actions {
  display: flex;
  gap: 10px;
}

.btn-danger-text {
  color: var(--danger) !important;
}

.btn-danger-text:hover {
  background: var(--danger-bg) !important;
  border-color: var(--danger-border) !important;
}

/* CAIXA DE STATUS (APROVADO / REPROVADO) */
.status-outcome-card {
  border-radius: 12px;
  padding: 24px;
  position: relative;
  overflow: hidden;
  box-shadow: var(--shadow-md);
  transition: all var(--transition-normal);
}

.status-outcome-card::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 150px;
  height: 100%;
  opacity: 0.1;
  pointer-events: none;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: right center;
}

.status-pass {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.15) 100%);
  border: 1px solid var(--success-border);
  box-shadow: 0 8px 32px -4px rgba(16, 185, 129, 0.15);
}

.status-fail {
  background: linear-gradient(135deg, rgba(244, 63, 94, 0.08) 0%, rgba(225, 29, 72, 0.15) 100%);
  border: 1px solid var(--danger-border);
  box-shadow: 0 8px 32px -4px rgba(244, 63, 94, 0.15);
}

.status-content {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  z-index: 1;
  position: relative;
}

.status-icon-glow {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.status-pass .status-icon-glow {
  background: var(--success);
  color: white;
  box-shadow: 0 0 16px var(--success-glow);
}

.status-fail .status-icon-glow {
  background: var(--danger);
  color: white;
  box-shadow: 0 0 16px var(--danger-glow);
}

.status-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 4px;
}

.status-pass .status-title {
  color: var(--success);
}

.status-fail .status-title {
  color: var(--danger);
}

.status-description {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.status-description strong {
  color: var(--text-primary);
  font-size: 14px;
}

/* Seção de Notas por Disciplina */
.grades-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.section-title-bar h2 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.badge-total-disciplines {
  font-size: 11px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 3px 8px;
  border-radius: 20px;
  color: var(--text-secondary);
}

/* Grid de Disciplinas */
.grades-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.grade-item-card {
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all var(--transition-fast);
}

.grade-item-card:hover {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.08);
}

.grade-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.subject-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.subject-score {
  font-size: 15px;
  font-weight: 700;
}

.score-pass {
  color: var(--success);
}

.score-fail {
  color: var(--danger);
}

/* Barra de Progresso Visual */
.progress-bar-track {
  width: 100%;
  height: 5px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.8s cubic-bezier(0.19, 1, 0.22, 1);
}

.fill-pass {
  background: var(--success-gradient);
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.3);
}

.fill-fail {
  background: var(--danger-gradient);
  box-shadow: 0 0 6px rgba(244, 63, 94, 0.3);
}

/* MODO EDIÇÃO */
.grade-item-card.edit-mode {
  background: rgba(17, 24, 39, 0.3);
  border-color: rgba(255, 255, 255, 0.05);
}

.edit-grade-group {
  margin-bottom: 0 !important;
  gap: 4px;
}

.edit-grade-group label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.input-grade-wrapper {
  display: flex;
  align-items: center;
  background: rgba(17, 24, 39, 0.6);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 0 10px;
  transition: all var(--transition-fast);
}

.input-grade-wrapper:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-glow);
}

.grade-input {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  width: 100%;
  padding: 8px 0;
  text-align: right;
  font-size: 14px;
  font-weight: 600;
  margin-right: 6px;
}

.max-value {
  color: var(--text-muted);
  font-size: 12px;
  user-select: none;
}

.editing-actions-bar {
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  gap: 16px;
}

@media (max-width: 768px) {
  .editing-actions-bar {
    flex-direction: column;
    align-items: flex-start;
  }
  .action-buttons {
    width: 100%;
    justify-content: flex-end;
  }
}

.editing-warning {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--text-secondary);
}

.warning-icon {
  color: var(--primary);
  flex-shrink: 0;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

/* Modais e Layouts de Formulário do Modal */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-close {
  background: transparent;
  color: var(--text-secondary);
  border-radius: 50%;
  width: 32px;
  height: 32px;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

.form-row {
  display: flex;
  gap: 14px;
}

.flex-1 {
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  padding-top: 16px;
}

/* Notificações Flutuantes (Toast) */
.notification-toast {
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: white;
  box-shadow: var(--shadow-lg);
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 10px;
  animation: slideIn 0.3s forwards cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.notification-toast.success {
  background: var(--success-gradient);
  box-shadow: 0 8px 24px var(--success-glow);
}

.notification-toast.error {
  background: var(--danger-gradient);
  box-shadow: 0 8px 24px var(--danger-glow);
}
</style>