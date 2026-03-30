#Include "Totvs.ch"
#Include "RestFul.ch"

/*/{Protheus.doc} WsCliente
Web Service REST para manutenção de Clientes (SA1)
@author Antigravity
@since 29/03/2026
/*/
WSRESTFUL WsCliente DESCRIPTION "Serviço REST para Clientes Protheus"
    WSDATA cCgc AS STRING
    
    WSMETHOD GET DESCRIPTION "Retorna dados do cliente" WSSYNTAX "/WsCliente || /WsCliente?cCgc={cCgc}"
    WSMETHOD POST DESCRIPTION "Inclui novo cliente" WSSYNTAX "/WsCliente/INCLUIR?cCgc={cCgc}"
    WSMETHOD PUT DESCRIPTION "Altera cliente existente" WSSYNTAX "/WsCliente/ALTERAR?cCgc={cCgc}"
    WSMETHOD DELETE DESCRIPTION "Exclui cliente" WSSYNTAX "/WsCliente/DELETE?cCgc={cCgc}"
END WSRESTFUL

WSMETHOD GET WSSERVICE WsCliente
    Local aArea   := GetArea()
    Local oResponse := JsonObject():New()
    Local cCgc    := Self:cCgc
    Local aData   := {}
    
    RpcSetEnv("01", "01") // Ajustar conforme necessário
    
    DbSelectArea("SA1")
    SA1->(DbSetOrder(3)) // A1_CGC
    
    If !Empty(cCgc)
        If SA1->(DbSeek(xFilial("SA1") + cCgc))
            aData := {;
                {"A1_COD",    SA1->A1_COD},;
                {"A1_LOJA",   SA1->A1_LOJA},;
                {"A1_NOME",   SA1->A1_NOME},;
                {"A1_NREDUZ", SA1->A1_NREDUZ},;
                {"A1_CGC",    SA1->A1_CGC};
            }
            Self:SetResponse(oResponse:ToJson(aData))
        Else
            Self:SetResponse("Cliente nao encontrado.")
        EndIf
    Else
        SA1->(DbGoTop())
        While !SA1->(Eof())
            AAdd(aData, {;
                {"A1_COD",    SA1->A1_COD},;
                {"A1_LOJA",   SA1->A1_LOJA},;
                {"A1_NOME",   SA1->A1_NOME},;
                {"A1_NREDUZ", SA1->A1_NREDUZ},;
                {"A1_CGC",    SA1->A1_CGC};
            })
            SA1->(DbSkip())
        EndDo
        Self:SetResponse(oResponse:ToJson(aData))
    EndIf
    
    RestArea(aArea)
Return .T.

WSMETHOD POST WSSERVICE WsCliente
    Local aArea     := GetArea()
    Local oJson     := JsonObject():New()
    Local aCampos   := {}
    Local aItem     := {}
    Local nI        := 0
    Local cError    := ""
    
    oJson:FromJson(Self:GetContent())
    
    If ValType(oJson['Data']) == "A"
        For nI := 1 To Len(oJson['Data'])
            AAdd(aCampos, {oJson['Data'][nI]['campo'], oJson['Data'][nI]['valor'], Nil})
        Next
    EndIf
    
    RpcSetEnv("01", "01")
    
    MSExecAuto({|x,y| MATA030(x,y)}, aCampos, 3) // 3 = Incluir
    
    If lMsErroAuto
        cError := MostraErro("/tmp", "error_sa1.txt")
        Self:SetResponse("Erro na inclusao: " + cError)
    Else
        Self:SetResponse("Sucesso: Cliente incluido.")
    EndIf
    
    RestArea(aArea)
Return .T.

WSMETHOD PUT WSSERVICE WsCliente
    Local aArea     := GetArea()
    Local oJson     := JsonObject():New()
    Local aCampos   := {}
    Local nI        := 0
    Local cError    := ""
    Local cCgc      := Self:cCgc
    
    oJson:FromJson(Self:GetContent())
    
    RpcSetEnv("01", "01")
    
    DbSelectArea("SA1")
    SA1->(DbSetOrder(3))
    If SA1->(DbSeek(xFilial("SA1") + cCgc))
        For nI := 1 To Len(oJson['Data'])
            AAdd(aCampos, {oJson['Data'][nI]['campo'], oJson['Data'][nI]['valor'], Nil})
        Next
        
        MSExecAuto({|x,y| MATA030(x,y)}, aCampos, 4) // 4 = Alterar
        
        If lMsErroAuto
            cError := MostraErro("/tmp", "error_sa1.txt")
            Self:SetResponse("Erro na alteracao: " + cError)
        Else
            Self:SetResponse("Sucesso: Cliente alterado.")
        EndIf
    Else
        Self:SetResponse("Cliente nao encontrado para alteracao.")
    EndIf
    
    RestArea(aArea)
Return .T.

WSMETHOD DELETE WSSERVICE WsCliente
    Local aArea     := GetArea()
    Local cCgc      := Self:cCgc
    Local cError    := ""
    
    RpcSetEnv("01", "01")
    
    DbSelectArea("SA1")
    SA1->(DbSetOrder(3))
    If SA1->(DbSeek(xFilial("SA1") + cCgc))
        MSExecAuto({|x,y| MATA030(x,y)}, Nil, 5) // 5 = Excluir
        
        If lMsErroAuto
            cError := MostraErro("/tmp", "error_sa1.txt")
            Self:SetResponse("Erro na exclusao: " + cError)
        Else
            Self:SetResponse("Sucesso: Cliente excluido.")
        EndIf
    Else
        Self:SetResponse("Cliente nao encontrado para exclusao.")
    EndIf
    
    RestArea(aArea)
Return .T.
