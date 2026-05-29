# 📚 Sistema de Notas Escolares

Um sistema completo de gerenciamento de alunos e notas escolares desenvolvido com:

* Vue.js + Vite
* Node.js
* Express
* MySQL
* Axios

O projeto permite:

* cadastrar alunos;
* armazenar notas;
* calcular médias automaticamente;
* consultar dados via API;
* integrar front-end com banco de dados;
* visualizar alunos e médias em tempo real.

---

# 🧠 Tecnologias Utilizadas

## Front-end

* Vue.js 3
* Vite
* Axios
* HTML5
* CSS3
* JavaScript

## Back-end

* Node.js
* Express
* CORS
* MySQL2

## Banco de Dados

* MySQL
* MySQL Workbench

---

# 📁 Estrutura do Projeto

```bash
ProjetoLocal/
│
├── backend/
│   ├── node_modules/
│   ├── package.json
│   └── server.js
│
├── src/
│   ├── assets/
│   ├── components/
│   ├── App.vue
│   └── main.ts
│
├── public/
├── package.json
├── vite.config.ts
└── README.md
```

---

# ⚙️ Como Executar o Projeto (Após git clone)

> **Atenção:** A pasta `node_modules` não é enviada ao GitHub (está no `.gitignore`).
> Após clonar o repositório, você **sempre** deve reinstalar as dependências em dois lugares.

---

## 1. Instalar Dependências do Front-end

Na **pasta raiz** do projeto (`Sistema-de-notas-escolares`):

```bash
npm install
```

---

## 2. Instalar Dependências do Back-end

Entre na pasta `backend`:

```bash
cd backend
npm install
```

---

## 3. Configurar a Senha do Banco de Dados

Abra o arquivo `backend/server.js` e substitua `SUA_SENHA` pela sua senha do MySQL:

```js
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'SUA_SENHA',  // ← coloque sua senha aqui
    database: 'projeto_integrado'
})
```

---

## 4. Iniciar o Back-end

Em um terminal, dentro da pasta `backend`:

```bash
node server.js
```

Saída esperada:
```
Servidor rodando na porta 3001
MySQL conectado!
```

---

## 5. Iniciar o Front-end

Em outro terminal, na **pasta raiz** do projeto:

```bash
npm run dev
```

---

# 🛢️ Configuração do Banco de Dados

## Criar banco

```sql
CREATE DATABASE projeto_integrado;
```

Selecionar banco:

```sql
USE projeto_integrado;
```

---

# 👨‍🎓 Tabela de Alunos

```sql
CREATE TABLE aluno(
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100),
    nascimento DATE,
    turma VARCHAR(50),
    sexo VARCHAR(1)
);
```

---

# 📝 Tabela de Notas

```sql
CREATE TABLE notas(
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_aluno INT,

    FOREIGN KEY(id_aluno)
    REFERENCES aluno(id),

    matematica DECIMAL(10,2),
    portugues DECIMAL(10,2),
    historia DECIMAL(10,2),
    geografia DECIMAL(10,2),
    biologia DECIMAL(10,2),
    quimica DECIMAL(10,2),
    fisica DECIMAL(10,2),
    sociologia DECIMAL(10,2),
    filosofia DECIMAL(10,2),
    artes DECIMAL(10,2),
    educacao_fisica DECIMAL(10,2),

    media DECIMAL(10,2)
    GENERATED ALWAYS AS (
        ROUND(
            (
                matematica +
                portugues +
                historia +
                geografia +
                biologia +
                quimica +
                fisica +
                sociologia +
                filosofia +
                artes +
                educacao_fisica
            ) / 11,
        2)
    ) STORED
);
```

---

# 🔗 Integração com MySQL

Arquivo:

```bash
backend/server.js
```

```js
const express = require('express')
const mysql = require('mysql2')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'SUA_SENHA',
    database: 'projeto_integrado'
})

db.connect((err) => {
    if(err){
        console.log(err)
    } else {
        console.log('MySQL conectado!')
    }
})

app.get('/alunos', (req, res) => {

    const sql = `
        SELECT
            aluno.nome,
            aluno.turma,
            notas.media
        FROM aluno
        JOIN notas
        ON aluno.id = notas.id_aluno
    `

    db.query(sql, (err, result) => {
        if(err){
            res.send(err)
        } else {
            res.json(result)
        }
    })

})

app.listen(3001, () => {
    console.log('Servidor rodando na porta 3001')
})
```

---

# ▶️ Rodando o Back-end

Dentro da pasta backend:

```bash
node server.js
```

Saída esperada:

```bash
MySQL conectado!
Servidor rodando na porta 3001
```

# 🚀 Rodando o Front-end

Na raiz do projeto:

```bash
npm run dev
```

O Vite abrirá algo como:

```bash
http://localhost:5173
```

---

# 🔄 Fluxo da Aplicação

```text
Vue.js → Axios → Express → MySQL
```

1. O Vue faz uma requisição HTTP;
2. O Axios envia a requisição;
3. O Express recebe;
4. O Node consulta o MySQL;
5. O banco devolve os dados;
6. O Vue renderiza na tela.

---

# 📊 Funcionalidades do Sistema

## Alunos

* Cadastro de alunos
* Organização por turma
* Controle de sexo
* Data de nascimento

## Notas

* Notas individuais por matéria
* Média automática
* Relacionamento com alunos
* Persistência no banco

## API

* Consulta de alunos
* Consulta de médias
* Integração REST

---

# 🛠️ Melhorias Futuras

* Cadastro via formulário
* Dashboard
* Ranking escolar
* Média por turma
* JWT Authentication

---

# 📌 Observações

* O projeto utiliza arquitetura separada entre front-end e back-end.
* O Vue.js não acessa o MySQL diretamente.
* Toda comunicação ocorre através da API Express.

---

# 👨‍💻 Autor

Projeto desenvolvido para fins educacionais e estudo de integração entre:

* Vue.js
* Node.js
* Express
* MySQL
