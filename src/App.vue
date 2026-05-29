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

// Estados Reativos de Login e Acesso
const isLoggedIn = ref(false)
const userRole = ref<'professor' | 'aluno' | null>(null)
const loginEmail = ref('')
const loginPassword = ref('')
const studentLoginStep = ref(1) // 1: Email/Senha, 2: Nome/Turma (caso aluno)
const studentLoginForm = ref({
  nome: '',
  turma: ''
})

// Estados Reativos do Dashboard
const alunos = ref<Aluno[]>([])
const searchQuery = ref('')
const sortBy = ref('name-asc')
const selectedAluno = ref<Aluno | null>(null)
const isEditingGrades = ref(false)
const showAddModal = ref(false)
const isSaving = ref(false)
const notification = ref<{ type: 'success' | 'error'; message: string } | null>(null)

// Controle de Tema (Padrão: Escuro)
const isDarkMode = ref(true)

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

// Executar o Login Inicial (Validação do Email)
const handleInitialLogin = async () => {
  const email = loginEmail.value.toLowerCase().trim()
  
  if (!email) {
    showNotification('error', 'Por favor, insira um e-mail válido.')
    return
  }

  // Regra 1: Professor
  if (email === 'professor@gmail.com') {
    isLoggedIn.value = true
    userRole.value = 'professor'
    selectedAluno.value = null
    showNotification('success', 'Acesso concedido como Professor!')
    await fetchAlunos()
  } 
  // Regra 2: Aluno (Transição para o Passo 2 de Verificação)
  else if (email === 'aluno@gmail.com') {
    studentLoginStep.value = 2
    studentLoginForm.value = { nome: '', turma: '' }
    await fetchAlunos() // Garantir lista atualizada na memória
  } 
  // Regras de bloqueio adicionais
  else {
    showNotification('error', 'E-mail não autorizado. Use professor@gmail.com ou aluno@gmail.com.')
  }
}

// Executar verificação de dados do aluno (Passo 2)
const handleStudentLoginVerification = () => {
  const nomeInput = studentLoginForm.value.nome.toLowerCase().trim()
  const turmaInput = studentLoginForm.value.turma.toLowerCase().trim()

  if (!nomeInput || !turmaInput) {
    showNotification('error', 'Por favor, preencha todos os campos.')
    return
  }

  // Encontrar o aluno compatível (Case-Insensitive)
  const match = alunos.value.find(aluno => 
    aluno.nome.toLowerCase().trim() === nomeInput &&
    aluno.turma.toLowerCase().trim() === turmaInput
  )

  if (match) {
    isLoggedIn.value = true
    userRole.value = 'aluno'
    selectedAluno.value = match
    showNotification('success', `Bem-vindo(a), ${match.nome}!`)
  } else {
    showNotification('error', 'Aluno não localizado com os dados inseridos. Verifique a grafia e turma.')
  }
}

// Função de Logoff / Sair
const handleLogout = () => {
  isLoggedIn.value = false
  userRole.value = null
  selectedAluno.value = null
  isEditingGrades.value = false
  studentLoginStep.value = 1
  loginEmail.value = ''
  loginPassword.value = ''
  studentLoginForm.value = { nome: '', turma: '' }
  showNotification('success', 'Sessão encerrada com sucesso.')
}

// Filtro e Ordenação de Alunos na barra lateral (Apenas Professor)
const filteredAlunos = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  
  // 1. Filtrar pelo termo de busca
  let list = alunos.value
  if (query) {
    list = list.filter(aluno => 
      aluno.nome.toLowerCase().includes(query) || 
      aluno.turma.toLowerCase().includes(query)
    )
  }
  
  // 2. Ordenar de acordo com a preferência selecionada (cópia rasa para evitar mutar estado original)
  return [...list].sort((a, b) => {
    if (sortBy.value === 'name-asc') {
      return a.nome.localeCompare(b.nome)
    } else if (sortBy.value === 'name-desc') {
      return b.nome.localeCompare(a.nome)
    } else if (sortBy.value === 'media-desc') {
      const mediaA = parseFloat(a.media?.toString() || '0')
      const mediaB = parseFloat(b.media?.toString() || '0')
      return mediaB - mediaA
    } else if (sortBy.value === 'media-asc') {
      const mediaA = parseFloat(a.media?.toString() || '0')
      const mediaB = parseFloat(b.media?.toString() || '0')
      return mediaA - mediaB
    }
    return 0
  })
})

// Cálculo de Estatísticas Gerais do Colégio (Exibido no painel inicial do Professor)
const schoolStats = computed(() => {
  const list = alunos.value
  if (list.length === 0) {
    return { total: 0, media: 0, aprovados: 0, reprovados: 0, taxaAprovacao: 0 }
  }
  
  let sumMedia = 0
  let countAprovados = 0
  let countReprovados = 0
  
  list.forEach(a => {
    const mediaVal = parseFloat(a.media?.toString() || '0')
    sumMedia += mediaVal
    if (mediaVal >= 7) {
      countAprovados++
    } else {
      countReprovados++
    }
  })
  
  const overallAvg = sumMedia / list.length
  const approvalRate = (countAprovados / list.length) * 100
  
  return {
    total: list.length,
    media: overallAvg,
    aprovados: countAprovados,
    reprovados: countReprovados,
    taxaAprovacao: approvalRate
  }
})

// Interface para o status de atenção
interface AttentionStatus {
  type: 'none' | 'grave' | 'alerta'
  subject?: {
    key: string
    label: string
    grade: number
  }
  message: string
}

// Cálculo das Áreas de Atenção com base no rendimento
const attentionStatus = computed<AttentionStatus | null>(() => {
  if (!selectedAluno.value) return null
  
  const gradesList = subjects.map(sub => {
    const val = parseFloat(selectedAluno.value![sub.key as keyof Aluno]?.toString() || '0')
    return { key: sub.key, label: sub.label, grade: isNaN(val) ? 0 : val }
  })
  
  // Filtrar disciplinas com nota abaixo de 7
  const belowSeven = gradesList.filter(s => s.grade < 7)
  
  // Se não houver nenhuma disciplina abaixo de 7
  if (belowSeven.length === 0) {
    return {
      type: 'none',
      message: 'Não há nenhuma área de atenção.'
    }
  }
  
  // Ordenar por nota (menor primeiro) para encontrar o pior rendimento
  belowSeven.sort((a, b) => a.grade - b.grade)
  const worst = belowSeven[0]
  
  // Se a nota mais baixa for 4 ou menor: Caso Grave (mostra apenas esta matéria)
  if (worst.grade <= 4) {
    return {
      type: 'grave',
      subject: worst,
      message: `Desempenho grave na disciplina de ${worst.label}.`
    }
  }
  
  // Se for entre 4 (exclusivo) e 7 (exclusivo): Apenas mensagem de aviso prévio
  return {
    type: 'alerta',
    message: 'Aviso prévio: O(A) aluno(a) possui notas abaixo da média que necessitam de atenção preventiva.'
  }
})

// Selecionar um aluno para visualizar detalhes (Apenas Professor)
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
  <!-- Main Container com classes para Modo Claro/Escuro, login e seleção no Mobile -->
  <div 
    class="dashboard-container" 
    :class="{ 
      'light-theme': !isDarkMode, 
      'has-selection': selectedAluno !== null,
      'is-logged-out': !isLoggedIn,
      'is-student-role': isLoggedIn && userRole === 'aluno'
    }"
  >
    <!-- Exibição de Notificações Temporárias (Disponível em qualquer tela) -->
    <div v-if="notification" class="notification-toast" :class="notification.type">
      <span>{{ notification.message }}</span>
    </div>

    <!-- TELA 1: PORTAL DE LOGIN DO COLÉGIO -->
    <div v-if="!isLoggedIn" class="login-screen-wrapper flex-center">
      <div class="login-card-holder">
        <div class="login-card-header">
          <div class="app-logo login-logo">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 14v7" />
            </svg>
            <span class="app-name">Integração</span>
          </div>
          <p class="subtitle font-login-sub">Portal Escolar</p>
        </div>

        <!-- ETAPA A: Informar E-mail e Senha -->
        <form v-if="studentLoginStep === 1" @submit.prevent="handleInitialLogin" class="login-fields-form">
          <div class="form-group">
            <label for="login-email">E-mail Institucional</label>
            <div class="input-icon-field-wrapper">
              <input 
                id="login-email" 
                v-model="loginEmail" 
                type="email" 
                placeholder="Ex: professor@gmail.com ou aluno@gmail.com" 
                required 
              />
            </div>
          </div>

          <div class="form-group">
            <label for="login-password">Senha de Acesso</label>
            <div class="input-icon-field-wrapper">
              <input 
                id="login-password" 
                v-model="loginPassword" 
                type="password" 
                placeholder="Sua senha institucional" 
              />
            </div>
          </div>

          <button type="submit" class="btn-primary btn-login-action">
            Avançar
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </form>

        <!-- ETAPA B: Caso aluno@gmail.com (Verificação de Nome Completo e Turma/Série) -->
        <form v-else @submit.prevent="handleStudentLoginVerification" class="login-fields-form">
          <div class="student-step-heading">
            <h3>Identificação Escolar</h3>
            <p>Confirme os dados cadastrados no Colégio para visualizar o boletim.</p>
          </div>

          <div class="form-group">
            <label for="student-name-input">Nome Completo do Aluno</label>
            <input 
              id="student-name-input"
              v-model="studentLoginForm.nome"
              type="text"
              placeholder="Ex: Arthur ou Maria"
              required
            />
          </div>

          <div class="form-group">
            <label for="student-class-input">Série / Turma</label>
            <input 
              id="student-class-input"
              v-model="studentLoginForm.turma"
              type="text"
              placeholder="Ex: 1A"
              required
            />
          </div>

          <div class="student-step-actions">
            <button type="button" class="btn-secondary flex-1" @click="studentLoginStep = 1">
              Voltar
            </button>
            <button type="submit" class="btn-primary flex-1">
              Ver Notas
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- TELA 2: PORTAL E DASHBOARD DO COLÉGIO (Logado) -->
    <div v-else class="portal-main-view" :class="{ 'student-portal-fullwidth': userRole === 'aluno' }">
      
      <!-- BARRA LATERAL (Apenas para Professor) -->
      <aside v-if="userRole === 'professor'" class="sidebar">
        <div class="sidebar-header">
          <div class="header-top-row">
            <div class="app-logo" @click="selectedAluno = null" style="cursor: pointer;">
              <!-- Ícone Acadêmico em SVG -->
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 14v7" />
              </svg>
              <span class="app-name">Integração</span>
            </div>

            <!-- Grupo de Ações do Header (Tema e Logout) -->
            <div class="header-action-buttons">
              <!-- Seletor de Tema (Sun/Moon) -->
              <button 
                class="btn-theme-toggle border-no" 
                :title="isDarkMode ? 'Modo Claro' : 'Modo Escuro'"
                @click="isDarkMode = !isDarkMode"
              >
                <svg v-if="isDarkMode" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
                <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              </button>

              <!-- Botão Sair (Logout) -->
              <button class="btn-theme-toggle border-no logout-mini-btn" title="Sair do Portal" @click="handleLogout">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>
          <p class="subtitle">Docente Administrativo</p>
        </div>

        <div class="sidebar-actions">
          <!-- Campo de Pesquisa -->
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

          <!-- Filtros de Ordenação -->
          <div class="filter-row">
            <span class="filter-label">Ordenar:</span>
            <select v-model="sortBy" class="sort-select">
              <option value="name-asc">Nome (A - Z)</option>
              <option value="name-desc">Nome (Z - A)</option>
              <option value="media-desc">Média (Maior → Menor)</option>
              <option value="media-asc">Média (Menor → Maior)</option>
            </select>
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

        <!-- Lista de Alunos -->
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
                  {{ aluno.sexo === 'M' ? 'Masc' : 'Fem' }}
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

      <!-- PAINEL CENTRAL / DETALHES DE NOTAS -->
      <main class="main-content-panel">
        
        <!-- ESTADO 1: Painel Geral do Professor (Nenhum Aluno Selecionado) -->
        <div v-if="userRole === 'professor' && !selectedAluno" class="empty-state-container flex-center">
          <div class="empty-state-content">
            <div class="empty-illustration">
              <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h2>Colégio Integração</h2>
            <p class="empty-state-subtitle">Rendimento Acadêmico Consolidado</p>
            
            <!-- Grid de Indicadores Escolares (Disponível apenas para Professor) -->
            <div class="dashboard-stats-grid">
              <div class="stat-card">
                <div class="stat-icon-box">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
                  </svg>
                </div>
                <div class="stat-info">
                  <span class="stat-value">{{ schoolStats.total }}</span>
                  <span class="stat-label">Alunos Cadastrados</span>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon-box" :class="schoolStats.media >= 7 ? 'success' : 'danger'">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 20V10M12 20V4M6 20v-6"/>
                  </svg>
                </div>
                <div class="stat-info">
                  <span class="stat-value">{{ formatGrade(schoolStats.media) }}</span>
                  <span class="stat-label">Média Geral do Colégio</span>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon-box success">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <div class="stat-info">
                  <span class="stat-value">{{ schoolStats.taxaAprovacao.toFixed(1) }}%</span>
                  <span class="stat-label">Taxa Geral de Aprovação</span>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon-box">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div class="stat-info">
                  <span class="stat-value">{{ schoolStats.aprovados }} / {{ schoolStats.reprovados }}</span>
                  <span class="stat-label">Aprovados vs Retidos</span>
                </div>
              </div>
            </div>

            <p class="select-instructions-text">Selecione um aluno na barra lateral esquerda para gerenciar sua ficha individual, aplicar notas nas 11 disciplinas ou cadastrar novos estudantes.</p>
          </div>
        </div>

        <!-- ESTADO 2: Exibição da Ficha de Notas (Professor consultando ou Aluno vendo seu Boletim) -->
        <div v-else-if="selectedAluno" class="student-details-wrapper">
          
          <!-- Cabeçalho do Boletim -->
          <header class="detail-header">
            <div class="student-profile-summary">
              <!-- Botão Voltar Mobile (Apenas Professor em telas pequenas) -->
              <button 
                v-if="userRole === 'professor'" 
                class="btn-back-mobile" 
                @click="selectedAluno = null" 
                title="Voltar para a Lista"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Voltar
              </button>

              <div class="avatar-circle">
                {{ selectedAluno.nome.charAt(0).toUpperCase() }}
              </div>
              <div class="student-basic-data">
                <h1 class="student-name-title">{{ selectedAluno.nome }}</h1>
                <div class="student-meta-row">
                  <span class="info-tag">
                    <strong>Turma/Série:</strong> {{ selectedAluno.turma }}
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

            <!-- Ações do Cabeçalho -->
            <div class="detail-header-actions">
              <!-- Caso Professor: Opções de Editar e Excluir -->
              <template v-if="userRole === 'professor' && !isEditingGrades">
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
              </template>

              <!-- Caso Aluno: Apenas Botão Desconectar/Sair -->
              <template v-else-if="userRole === 'aluno'">
                <!-- Seletor de Tema no boletim do aluno -->
                <button 
                  class="btn-theme-toggle" 
                  :title="isDarkMode ? 'Modo Claro' : 'Modo Escuro'"
                  @click="isDarkMode = !isDarkMode"
                  style="margin-right: 8px;"
                >
                  <svg v-if="isDarkMode" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                  <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                </button>

                <button class="btn-secondary" @click="handleLogout">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sair do Portal
                </button>
              </template>
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
                <svg v-if="parseFloat(selectedAluno.media?.toString() || '0') >= 7" viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <!-- Ícone Cruz/Alerta (Reprovado) -->
                <svg v-else viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2.5">
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
                    ? 'Parabéns! Desempenho escolar aprovado segundo os critérios de aprovação de nota mínima 7.00.' 
                    : 'Fica retido(a) para recuperação por não ter atingido a média mínima exigida de 7.00.' 
                  }}
                </p>
              </div>
            </div>
          </section>

          <!-- Seção: Áreas de Atenção (nova lógica de estados) -->
          <section v-if="attentionStatus" class="weakness-section">
            <div class="section-title-bar">
              <h2>📉 Áreas de Atenção</h2>
            </div>

            <!-- Estado: Nenhuma área de atenção (todas notas >= 7) -->
            <div v-if="attentionStatus.type === 'none'" class="attention-card attention-none">
              <div class="attention-icon-box attention-icon-none">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div class="attention-text">
                <span class="attention-title">Parabéns! Sem áreas de atenção</span>
                <span class="attention-desc">Não há nenhuma área de atenção. Todas as notas estão acima da média mínima.</span>
              </div>
            </div>

            <!-- Estado: Alerta prévio (notas entre 4 e 7) -->
            <div v-else-if="attentionStatus.type === 'alerta'" class="attention-card attention-alerta">
              <div class="attention-icon-box attention-icon-alerta">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div class="attention-text">
                <span class="attention-title">Aviso Prévio</span>
                <span class="attention-desc">{{ attentionStatus.message }}</span>
              </div>
            </div>

            <!-- Estado: Situação grave (nota <= 4) -->
            <div v-else-if="attentionStatus.type === 'grave'" class="attention-card attention-grave">
              <div class="attention-icon-box attention-icon-grave">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div class="attention-text">
                <span class="attention-title">Alerta Crítico</span>
                <span class="attention-desc">{{ attentionStatus.message }}</span>
              </div>
              <div v-if="attentionStatus.subject" class="attention-subject-badge">
                <span class="attention-subject-name">{{ attentionStatus.subject.label }}</span>
                <span class="attention-subject-grade">{{ formatGrade(attentionStatus.subject.grade) }}</span>
              </div>
            </div>
          </section>


          <!-- Grade de Notas das 11 Disciplinas -->
          <section class="grades-section">
            <div class="section-title-bar">
              <h2>Ficha Acadêmica de Notas</h2>
              <span class="badge-total-disciplines">11 Disciplinas</span>
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

            <!-- MODO EDIÇÃO: Exibe campos input numéricos para as notas (Apenas para Professor) -->
            <div v-else-if="userRole === 'professor'" class="grades-editing-form">
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
                  <span>As notas salvas serão imediatamente sincronizadas com o banco de dados do Colégio.</span>
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

      <!-- Modal Modal-Backdrop: Adicionar Novo Aluno (Apenas Professor) -->
      <div v-if="userRole === 'professor' && showAddModal" class="modal-backdrop" @click.self="showAddModal = false">
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
  </div>
</template>

<style scoped>
/* ========================================== */
/* ESTILOS DA TELA DE LOGIN ESCAPE / GLASS    */
/* ========================================== */

.login-screen-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: var(--bg-primary);
  background-image: var(--bg-gradient);
  z-index: 999;
}

.login-card-holder {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 36px;
  width: 100%;
  max-width: 420px;
  box-shadow: var(--shadow-lg);
  animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.login-logo {
  justify-content: center;
  margin-bottom: 8px;
}

.login-card-header {
  text-align: center;
  margin-bottom: 28px;
}

.font-login-sub {
  font-size: 12px !important;
  color: var(--text-secondary) !important;
  font-weight: 500 !important;
}

.login-fields-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.input-icon-field-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.input-icon-field-wrapper input {
  width: 100%;
}

.btn-login-action {
  width: 100%;
  height: 44px;
  margin-top: 10px;
  font-size: 15px;
}

.student-step-heading {
  text-align: center;
  margin-bottom: 12px;
}

.student-step-heading h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.student-step-heading p {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
  line-height: 1.4;
}

.student-step-actions {
  display: flex;
  gap: 12px;
  margin-top: 10px;
}

.student-step-actions button {
  height: 40px;
}

/* ========================================== */
/* ESTILOS DO PORTAL DO COLÉGIO               */
/* ========================================== */

.portal-main-view {
  display: grid;
  grid-template-columns: 340px 1fr;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* Layout Full-Width para o portal do Aluno */
.portal-main-view.student-portal-fullwidth {
  grid-template-columns: 1fr !important;
}

.portal-main-view.student-portal-fullwidth .sidebar {
  display: none !important;
}

/* Grid / Sidebar */
.sidebar {
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--glass-border);
  display: flex;
  flex-direction: column;
  height: 100vh;
  transition: background-color 0.4s ease, border-color 0.4s ease;
}

.sidebar-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--glass-border);
}

.header-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--primary);
}

.app-name {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 0.5px;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-action-buttons {
  display: flex;
  align-items: center;
  gap: 6px;
}

.border-no {
  border: none !important;
}

/* Botão Alternador de Tema e Sair */
.btn-theme-toggle {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--card-border);
  color: var(--text-secondary);
  border-radius: 8px;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-theme-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  border-color: var(--card-border-hover);
}

.logout-mini-btn:hover {
  color: var(--danger) !important;
  background: var(--danger-bg) !important;
  border-color: var(--danger-border) !important;
}

.light-theme .btn-theme-toggle {
  background: rgba(15, 23, 42, 0.04);
}

.light-theme .btn-theme-toggle:hover {
  background: rgba(15, 23, 42, 0.08);
}

.subtitle {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--text-muted);
  margin-top: 4px;
  font-weight: 600;
}

.sidebar-actions {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-bottom: 1px solid var(--glass-border);
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

/* Linha de Ordenação */
.filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.filter-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  font-weight: 600;
  white-space: nowrap;
  user-select: none;
}

.sort-select {
  flex: 1;
  height: 34px;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 6px;
  background: rgba(17, 24, 39, 0.4);
  border: 1px solid var(--card-border);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.sort-select:focus {
  outline: none;
  border-color: var(--primary);
}

/* Botão Adicionar Aluno */
.add-student-btn {
  width: 100%;
  height: 38px;
}

/* Correções para o modo claro nos inputs */
.light-theme .search-input,
.light-theme .sort-select,
.light-theme .grade-input,
.light-theme select,
.light-theme input {
  background: #ffffff !important;
  color: #0f172a !important;
  border-color: rgba(15, 23, 42, 0.12) !important;
}

/* Estilos para inputs e selects no modo escuro (padrão) */
.search-input,
.sort-select,
.grade-input,
select,
input {
  background: rgba(15, 23, 42, 0.6) !important;
  color: var(--text-primary) !important;
  border: 1px solid var(--card-border) !important;
}

.search-input:focus,
.sort-select:focus,
.grade-input:focus,
select:focus,
input:focus {
  outline: none;
  border-color: var(--primary) !important;
  box-shadow: 0 0 0 3px var(--primary-glow) !important;
}

.sort-select option,
select option {
  background-color: var(--bg-secondary) !important;
  color: var(--text-primary) !important;
}

.light-theme .search-icon {
  color: #94a3b8;
}

.light-theme .input-grade-wrapper {
  background: #ffffff !important;
  border-color: rgba(15, 23, 42, 0.12) !important;
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
  background: rgba(255, 255, 255, 0.015);
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

.light-theme .student-class-badge {
  background: rgba(15, 23, 42, 0.05);
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
}

.media-fail {
  background: var(--danger-bg);
  color: var(--danger);
  border: 1px solid var(--danger-border);
}

/* Painel de Conteúdo Principal */
.main-content-panel {
  flex: 1;
  height: 100vh;
  overflow-y: auto;
  position: relative;
  background-color: var(--bg-primary);
  transition: background-color 0.4s ease;
}

/* Estado Vazio - Grid de Estatísticas Escolares */
.empty-state-container {
  height: 100%;
  padding: 40px;
}

.empty-state-content {
  text-align: center;
  max-width: 680px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-illustration {
  margin-bottom: 16px;
  color: var(--primary);
  opacity: 0.8;
  animation: float 4s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.empty-state-content h2 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.empty-state-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  margin-bottom: 24px;
}

.select-instructions-text {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.6;
  max-width: 520px;
}

/* Dashboard Grid de Indicadores */
.dashboard-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  width: 100%;
  margin-bottom: 28px;
}

@media (max-width: 600px) {
  .dashboard-stats-grid {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  text-align: left;
  transition: all var(--transition-fast);
  box-shadow: var(--shadow-sm);
}

.stat-card:hover {
  border-color: var(--card-border-hover);
  transform: translateY(-2px);
  background: var(--card-hover-bg);
}

.stat-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--primary-glow);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-box.success {
  background: var(--success-bg);
  color: var(--success);
}

.stat-icon-box.danger {
  background: var(--danger-bg);
  color: var(--danger);
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
  font-weight: 500;
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
  width: 100%;
}

/* Botão Voltar Mobile */
.btn-back-mobile {
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--card-border);
  color: var(--text-primary);
  border-radius: 8px;
  height: 38px;
  padding: 0 12px;
  gap: 6px;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: 13px;
  font-weight: 500;
  flex-shrink: 0;
}

.btn-back-mobile:hover {
  background: rgba(255, 255, 255, 0.1);
}

.light-theme .btn-back-mobile {
  background: rgba(15, 23, 42, 0.04);
  border-color: rgba(15, 23, 42, 0.08);
}

.light-theme .btn-back-mobile:hover {
  background: rgba(15, 23, 42, 0.08);
}

@media (max-width: 768px) {
  .btn-back-mobile {
    display: inline-flex;
  }
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
  flex-shrink: 0;
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

.light-theme .info-tag {
  background: rgba(15, 23, 42, 0.03);
  border-color: rgba(15, 23, 42, 0.05);
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
  padding: 20px 24px;
  position: relative;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);
}

.status-pass {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(5, 150, 105, 0.12) 100%);
  border: 1px solid var(--success-border);
}

.status-fail {
  background: linear-gradient(135deg, rgba(244, 63, 94, 0.06) 0%, rgba(225, 29, 72, 0.12) 100%);
  border: 1px solid var(--danger-border);
}

.status-content {
  display: flex;
  align-items: center;
  gap: 18px;
  z-index: 1;
  position: relative;
}

.status-icon-glow {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
}

.status-pass .status-icon-glow {
  background: var(--success);
}

.status-fail .status-icon-glow {
  background: var(--danger);
}

.status-title {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 2px;
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
  line-height: 1.5;
}

.status-description strong {
  color: var(--text-primary);
  font-size: 13.5px;
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

.light-theme .badge-total-disciplines {
  background: rgba(15, 23, 42, 0.03);
  border-color: rgba(15, 23, 42, 0.05);
}

/* Grid de Disciplinas */
.grades-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.grade-item-card {
  background: rgba(255, 255, 255, 0.012);
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

.light-theme .grade-item-card:hover {
  background: #f1f5f9;
  border-color: rgba(0, 0, 0, 0.08);
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

.light-theme .progress-bar-track {
  background: rgba(15, 23, 42, 0.05);
}

.progress-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.8s cubic-bezier(0.19, 1, 0.22, 1);
}

.fill-pass {
  background: var(--success-gradient);
}

.fill-fail {
  background: var(--danger-gradient);
}

/* MODO EDIÇÃO */
.grade-item-card.edit-mode {
  background: rgba(17, 24, 39, 0.2);
  border-color: rgba(255, 255, 255, 0.04);
}

.light-theme .grade-item-card.edit-mode {
  background: #f8fafc;
  border-color: rgba(0, 0, 0, 0.05);
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

.light-theme .input-grade-wrapper {
  background: #ffffff;
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
  background: rgba(255, 255, 255, 0.012);
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

.light-theme .btn-close:hover {
  background: rgba(0, 0, 0, 0.05);
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

.light-theme .modal-footer {
  border-color: rgba(0, 0, 0, 0.05);
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
  box-shadow: var(--shadow-md);
  z-index: 1000;
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
}

.notification-toast.error {
  background: var(--danger-gradient);
}

/* ====================================== */
/* NOVOS ESTILOS - CARDS DE ÁREA DE ATENÇÃO */
/* ====================================== */
.weakness-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.attention-card {
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all var(--transition-fast);
}

/* Nenhuma área de atenção - Verde */
.attention-none {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.1) 100%);
  border: 1px solid var(--success-border);
}

/* Aviso prévio - Amarelo/Laranja */
.attention-alerta {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(217, 119, 6, 0.1) 100%);
  border: 1px solid rgba(245, 158, 11, 0.25);
}

/* Alerta crítico - Vermelho */
.attention-grave {
  background: linear-gradient(135deg, rgba(244, 63, 94, 0.06) 0%, rgba(225, 29, 72, 0.12) 100%);
  border: 1px solid var(--danger-border);
}

.attention-icon-box {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.attention-icon-none {
  background: var(--success-bg);
  color: var(--success);
  border: 1px solid var(--success-border);
}

.attention-icon-alerta {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.attention-icon-grave {
  background: var(--danger-bg);
  color: var(--danger);
  border: 1px solid var(--danger-border);
}

.attention-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.attention-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.attention-none .attention-title { color: var(--success); }
.attention-alerta .attention-title { color: #f59e0b; }
.attention-grave .attention-title { color: var(--danger); }

.attention-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.attention-subject-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--danger-bg);
  border: 1px solid var(--danger-border);
  border-radius: 10px;
  padding: 8px 14px;
  flex-shrink: 0;
  gap: 2px;
}

.attention-subject-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--danger);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.attention-subject-grade {
  font-size: 18px;
  font-weight: 800;
  color: var(--danger);
  line-height: 1;
}
</style>