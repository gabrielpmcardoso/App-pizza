let listaPizzasCadastradas = [];
let _id_pizza = null;

const BASE = "https://backend-s0hl.onrender.com";
const PIZZARIA_ID = "pizzaria_do_ze";

const applista = document.getElementById('applista');
const appcadastro = document.getElementById('appcadastro');
const listaPizzas = document.getElementById('listaPizzas');
const btnNovo = document.getElementById('btnNovo');
const btnVoltarLista = document.getElementById('btnVoltarLista');

const imagem = document.getElementById('imagem');
const pizza = document.getElementById('pizza');
const preco = document.getElementById('preco');

const btnFoto = document.getElementById('btnFoto');
const btnSalvar = document.getElementById('btnSalvar');
const btnExcluir = document.getElementById('btnExcluir');
const btnCancelar = document.getElementById('btnCancelar');

function mostrarLista(){
  applista.style.display = 'flex';
  appcadastro.style.display = 'none';
  appcadastro.setAttribute('aria-hidden','true');
  carregarPizzas();
}
function mostrarCadastro(){
  applista.style.display = 'none';
  appcadastro.style.display = 'flex';
  appcadastro.removeAttribute('aria-hidden');
}

document.addEventListener('deviceready', onDeviceReady, false);
if (!window.cordova){
  document.addEventListener('DOMContentLoaded', () => {
    onDeviceReady();
  });
}

function onDeviceReady(){
  try{
    if (cordova?.plugin?.http?.setDataSerializer){
      cordova.plugin.http.setDataSerializer('json');
    }
  }catch(e){ console.log('Serializer fallback', e); }

  btnNovo?.addEventListener('click', () => {
    _id_pizza = null;
    imagem.style.backgroundImage = '';
    pizza.value = '';
    preco.value = '';
    mostrarCadastro();
  });
  btnVoltarLista?.addEventListener('click', mostrarLista);
  btnCancelar?.addEventListener('click', mostrarLista);

  btnFoto?.addEventListener('click', tirarFoto);
  btnSalvar?.addEventListener('click', salvarPizza);
  btnExcluir?.addEventListener('click', excluirPizza);

  mostrarLista();
}

function tirarFoto(){
  if (navigator.camera && navigator.camera.getPicture){
    navigator.camera.getPicture(onSuccess, onFail, {
      quality: 70,
      destinationType: navigator.camera.DestinationType.DATA_URL,
      targetWidth: 800,
      targetHeight: 800,
      correctOrientation: true,
      saveToPhotoAlbum: false
    });
    function onSuccess(imageData){
      const url = `url('data:image/jpeg;base64,${imageData}')`;
      imagem.style.backgroundImage = url;
    }
    function onFail(msg){ alert('Não foi possível obter a foto: ' + msg); }
  } else {
    alert('Câmera indisponível neste ambiente. Use o app no dispositivo para tirar foto.');
  }
}

async function httpGet(url){
  if (cordova?.plugin?.http?.get){
    return new Promise((resolve,reject)=>{
      cordova.plugin.http.get(url, {}, {}, (resp)=>resolve({status:resp.status, data:resp.data}), reject);
    });
  } else {
    const r = await fetch(url);
    const t = await r.text();
    return { status:r.status, data:t };
  }
}

async function httpJSON(method, url, body){
  if (cordova?.plugin?.http?.sendRequest){
    return new Promise((resolve,reject)=>{
      cordova.plugin.http.sendRequest(url, {
        method,
        data: body,
        serializer: 'json',
        headers: { 'Content-Type': 'application/json' }
      }, (resp)=>resolve({status:resp.status, data:resp.data}), reject);
    });
  } else {
    const r = await fetch(url, {
      method,
      headers:{ 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const t = await r.text();
    return { status:r.status, data:t };
  }
}

async function carregarPizzas(){
  listaPizzas.innerHTML = '';
  const url = `${BASE}/admin/pizzas/${PIZZARIA_ID}`;
  try{
    const response = await httpGet(url);
    if (response.data && response.data !== ''){
      try{
        listaPizzasCadastradas = JSON.parse(response.data);
      }catch(parseErr){
        console.warn('Falha ao parsear, tentando como JSON direto...', parseErr);
        listaPizzasCadastradas = Array.isArray(response.data) ? response.data : [];
      }
    } else {
      listaPizzasCadastradas = [];
    }

    if (listaPizzasCadastradas.length === 0){
      const vazio = document.createElement('div');
      vazio.className = 'linha';
      vazio.textContent = 'Nenhuma pizza cadastrada ainda';
      listaPizzas.appendChild(vazio);
      return;
    }

    listaPizzasCadastradas.forEach((item, idx) => {
      const novo = document.createElement('div');
      novo.classList.add('linha');
      novo.id = String(idx);
      novo.innerHTML = `
        <span>${item.pizza}</span>
        <span>R$ ${Number(item.preco||0).toFixed(2)}</span>
      `;
      novo.onclick = function(){ carregarDadosPizza(novo.id); };
      listaPizzas.appendChild(novo);
    });
  }catch(e){
    console.error(e);
    const erro = document.createElement('div');
    erro.className = 'linha';
    erro.textContent = 'Erro ao carregar pizzas. Tente novamente.';
    listaPizzas.appendChild(erro);
  }
}

function carregarDadosPizza(id){
  const item = listaPizzasCadastradas[id];
  if (!item) return;
  _id_pizza = item._id || null;
  imagem.style.backgroundImage = item.imagem || '';
  pizza.value = item.pizza || '';
  preco.value = item.preco || '';
  mostrarCadastro();
}

async function salvarPizza(){
  const body = {
    pizzaria: PIZZARIA_ID,
    pizza: pizza.value?.trim(),
    preco: preco.value,
    imagem: imagem.style.backgroundImage || ''
  };

  if (!body.pizza){ alert('Informe o nome da pizza.'); return; }
  if (!body.preco){ alert('Informe o preço.'); return; }

  try{
    if (_id_pizza){
      body.pizzaid = _id_pizza;
      const resp = await httpJSON('PUT', `${BASE}/admin/pizza/`, body);
      if (String(resp.status).startsWith('2')){
        alert('Pizza atualizada com sucesso!');
      } else {
        alert('Falha ao atualizar a pizza.');
      }
    } else {
      const resp = await httpJSON('POST', `${BASE}/admin/pizza/`, body);
      if (String(resp.status).startsWith('2')){
        alert('Pizza cadastrada com sucesso!');
      } else {
        alert('Falha ao cadastrar a pizza.');
      }
    }
    mostrarLista();
  }catch(e){
    console.error(e);
    alert('Erro ao salvar.');
  }
}

async function excluirPizza(){
  const nome = pizza.value?.trim();
  if (!nome){ alert('Selecione uma pizza para excluir.'); return; }
  if (!confirm(`Excluir a pizza "${nome}"?`)) return;

  try{
    const url = `${BASE}/admin/pizza/${PIZZARIA_ID}/${encodeURIComponent(nome)}`;
    let resp;
    if (cordova?.plugin?.http?.delete){
      resp = await new Promise((resolve,reject)=>{
        cordova.plugin.http.delete(url, {}, {}, (r)=>resolve({status:r.status, data:r.data}), reject);
      });
    } else {
      resp = await fetch(url, { method:'DELETE' });
      resp = { status: resp.status, data: '' };
    }
    if (String(resp.status).startsWith('2')){
      alert('Pizza excluída!');
      mostrarLista();
    } else {
      alert('Falha ao excluir.');
    }
  }catch(e){
    console.error(e);
    alert('Erro ao excluir.');
  }
}