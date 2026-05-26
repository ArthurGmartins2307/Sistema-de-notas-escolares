const express = require('express')
const mysql = require('mysql2')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'senaiSQL2026',
    database: 'projeto_integrado'
})

db.connect((err) => {
    if(err){
        console.log('Erro ao conectar:', err)
    } else {
        console.log('MySQL conectado!')
    }
})

app.get('/alunos', (req, res) => {
    const sql = `
        SELECT
            aluno.id,
            aluno.nome,
            DATE_FORMAT(aluno.nascimento, '%Y-%m-%d') as nascimento,
            aluno.turma,
            aluno.sexo,
            notas.matematica,
            notas.portugues,
            notas.historia,
            notas.geografia,
            notas.biologia,
            notas.quimica,
            notas.fisica,
            notas.sociologia,
            notas.filosofia,
            notas.artes,
            notas.educacao_fisica,
            notas.media
        FROM aluno
        LEFT JOIN notas
        ON aluno.id = notas.id_aluno
        ORDER BY aluno.nome ASC
    `

    db.query(sql, (err, result) => {
        if(err){
            console.error('Erro ao buscar alunos:', err)
            res.status(500).send(err)
        } else {
            res.json(result)
        }
    })
})

// Cadastrar novo aluno e criar registro de notas padrão
app.post('/alunos', (req, res) => {
    const { nome, nascimento, turma, sexo } = req.body
    if (!nome || !turma) {
        return res.status(400).json({ error: 'Nome e Turma são obrigatórios.' })
    }

    const sqlAluno = 'INSERT INTO aluno (nome, nascimento, turma, sexo) VALUES (?, ?, ?, ?)'
    db.query(sqlAluno, [nome, nascimento || null, turma, sexo || null], (err, result) => {
        if (err) {
            console.error('Erro ao cadastrar aluno:', err)
            return res.status(500).json({ error: err.message })
        }
        
        const id_aluno = result.insertId
        
        // Criar registro na tabela notas com notas zeradas
        const sqlNotas = `
            INSERT INTO notas (
                id_aluno, matematica, portugues, historia, geografia, biologia, 
                quimica, fisica, sociologia, filosofia, artes, educacao_fisica
            ) VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
        `
        db.query(sqlNotas, [id_aluno], (errNotas) => {
            if (errNotas) {
                console.error('Erro ao criar notas do aluno:', errNotas)
                return res.status(500).json({ error: errNotas.message })
            }
            
            res.status(201).json({
                id: id_aluno,
                nome,
                nascimento,
                turma,
                sexo,
                matematica: 0,
                portugues: 0,
                historia: 0,
                geografia: 0,
                biologia: 0,
                quimica: 0,
                fisica: 0,
                sociologia: 0,
                filosofia: 0,
                artes: 0,
                educacao_fisica: 0,
                media: 0
            })
        })
    })
})

// Editar notas de um aluno
app.put('/alunos/:id/notas', (req, res) => {
    const id_aluno = req.params.id
    const {
        matematica, portugues, historia, geografia, biologia,
        quimica, fisica, sociologia, filosofia, artes, educacao_fisica
    } = req.body

    const sql = `
        UPDATE notas 
        SET 
            matematica = ?, 
            portugues = ?, 
            historia = ?, 
            geografia = ?, 
            biologia = ?, 
            quimica = ?, 
            fisica = ?, 
            sociologia = ?, 
            filosofia = ?, 
            artes = ?, 
            educacao_fisica = ?
        WHERE id_aluno = ?
    `

    const values = [
        matematica || 0,
        portugues || 0,
        historia || 0,
        geografia || 0,
        biologia || 0,
        quimica || 0,
        fisica || 0,
        sociologia || 0,
        filosofia || 0,
        artes || 0,
        educacao_fisica || 0,
        id_aluno
    ]

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Erro ao atualizar notas:', err)
            return res.status(500).json({ error: err.message })
        }
        res.json({ message: 'Notas atualizadas com sucesso!' })
    })
})

// Excluir aluno e suas notas
app.delete('/alunos/:id', (req, res) => {
    const id_aluno = req.params.id

    // Primeiro excluir as notas
    const sqlNotas = 'DELETE FROM notas WHERE id_aluno = ?'
    db.query(sqlNotas, [id_aluno], (err) => {
        if (err) {
            console.error('Erro ao deletar notas:', err)
            return res.status(500).json({ error: err.message })
        }

        // Depois excluir o aluno
        const sqlAluno = 'DELETE FROM aluno WHERE id = ?'
        db.query(sqlAluno, [id_aluno], (err2) => {
            if (err2) {
                console.error('Erro ao deletar aluno:', err2)
                return res.status(500).json({ error: err2.message })
            }
            res.json({ message: 'Aluno excluído com sucesso!' })
        })
    })
})

app.listen(3001, () => {
    console.log('Servidor rodando na porta 3001')
})