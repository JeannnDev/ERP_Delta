#Include "totvs.ch"
#Include "restful.ch"

/**-------------------------------------------------------------------------------------------**/
/** PROJETO       : WebService para Controle de Producao - SZT010                            **/
/**-------------------------------------------------------------------------------------------**/

WSRESTFUL WsCtrlTempo DESCRIPTION "Servico REST para Controle de Producao - SZT010"
    WSDATA cOP      AS STRING
    WSDATA cOper    AS STRING
    WSDATA filial   AS STRING

    WSMETHOD GET  DESCRIPTION "Consulta eventos" WSSYNTAX "/WsCtrlTempo || /WsCtrlTempo?cOP={cOP}&cOper={cOper}"
    WSMETHOD POST DESCRIPTION "Inclui evento"    WSSYNTAX "/WsCtrlTempo"
END WSRESTFUL

WSMETHOD GET WSSERVICE WsCtrlTempo

    Local aArea     := GetArea()
    Local oRet      := JsonObject():New()
    Local aData     := {}
    Local oItem
    Local cFilLoc   := ::filial
    Local cOPFil    := AllTrim(Self:cOP)
    Local cOperFil  := AllTrim(Self:cOper)

    If Empty(cFilLoc)
        cFilLoc := Self:GetHeader("FILIAL")
    EndIf
    If Empty(cFilLoc)
        cFilLoc := xFilial("SZT")
    EndIf

    cFilLoc := AllTrim(cFilLoc)

    DbSelectArea("SZT")
    SZT->(DbGoTop())

    While !SZT->(Eof())
        // Filtra por filial (aceita a filial informada OU se estiver vazio no banco)
        If !Empty(AllTrim(SZT->ZT_FILIAL)) .And. AllTrim(SZT->ZT_FILIAL) <> cFilLoc
            SZT->(DbSkip())
            Loop
        EndIf

        If !Empty(cOPFil) .And. AllTrim(SZT->ZT_OP) <> cOPFil
            SZT->(DbSkip())
            Loop
        EndIf

        If !Empty(cOperFil) .And. AllTrim(SZT->ZT_OPER) <> cOperFil
            SZT->(DbSkip())
            Loop
        EndIf


        SB1->(DbSelectArea("SB1"), DbSetOrder(1), DbSeek(xFilial("SB1") + SZT->ZT_COD))
        
        oItem := JsonObject():New()
        oItem["ZT_COD"]      := AllTrim(SZT->ZT_COD)
        oItem["B1_DESCPRD"]  := AllTrim(SB1->B1_DESC)
        oItem["ZT_OP"]       := AllTrim(SZT->ZT_OP)
        oItem["ZT_RECURSO"]  := AllTrim(SZT->ZT_RECURSO)
        oItem["ZT_OPER"]     := AllTrim(SZT->ZT_OPER)
        oItem["ZT_PRVFIM"]   := DToS(SZT->ZT_PRVFIM)
        oItem["ZT_EVENTO"]   := AllTrim(SZT->ZT_EVENTO)
        oItem["ZT_DATA"]     := DToS(SZT->ZT_DATA)
        oItem["ZT_HORA"]     := AllTrim(SZT->ZT_HORA)
        oItem["ZT_MOTIVO"]   := AllTrim(SZT->ZT_MOTIVO)
        oItem["ZT_CODPER"]   := AllTrim(SZT->ZT_CODPER)
        oItem["ZT_NOME"]     := AllTrim(SZT->ZT_NOME)
        oItem["ZT_STATUS"]   := AllTrim(SZT->ZT_STATUS)
        oItem["ZT_FILIAL"]   := AllTrim(SZT->ZT_FILIAL)

        AAdd(aData, oItem)
        SZT->(DbSkip())
    EndDo

    If Len(aData) == 0
        oRet["status"]   := "vazio"
        oRet["mensagem"] := "Sem registros para a filial: " + cFilLoc
        oRet["debug_filial"] := cFilLoc
        oRet["dados"]    := {}
    Else
        oRet["status"]   := "sucesso"
        oRet["dados"]    := aData
    EndIf

    Self:SetResponse(oRet:ToJson())

    RestArea(aArea)
Return .T.

WSMETHOD POST WSSERVICE WsCtrlTempo

    Local aArea     := GetArea()
    Local oJson     := JsonObject():New()
    Local oRet      := JsonObject():New()
    Local cFilLoc   := ::filial
    Local dData     := dDataBase
    Local cHora     := Time()


    If Empty(cFilLoc)
        cFilLoc := Self:GetHeader("FILIAL")
    EndIf
    If Empty(cFilLoc)
        cFilLoc := xFilial("SZT")
    EndIf
    cFilLoc := AllTrim(cFilLoc)

    oJson:FromJson(Self:GetContent())

    If Empty(oJson["ZT_OP"]) .Or. Empty(oJson["ZT_OPER"])
        oRet["status"]   := "erro"
        oRet["mensagem"] := "Campos obrigatorios faltando"
        Self:SetResponse(oRet:ToJson())
        RestArea(aArea)
        Return .T.
    EndIf

    DbSelectArea("SZT")
    RecLock("SZT", .T.)
    SZT->ZT_FILIAL   := cFilLoc
    SZT->ZT_COD      := PadR(AllTrim(oJson["ZT_COD"]),     TamSX3("ZT_COD")[1]) // Codigo do Produto
    SZT->ZT_OP       := PadR(AllTrim(oJson["ZT_OP"]),      TamSX3("ZT_OP")[1])
    SZT->ZT_RECURSO  := PadR(AllTrim(oJson["ZT_RECURSO"]), TamSX3("ZT_RECURSO")[1])
    SZT->ZT_OPER     := PadR(AllTrim(oJson["ZT_OPER"]),    TamSX3("ZT_OPER")[1])
    SZT->ZT_PRVFIM   := SToD(oJson["ZT_PRVFIM"])
    SZT->ZT_EVENTO   := PadR(AllTrim(oJson["ZT_EVENTO"]),  TamSX3("ZT_EVENTO")[1])
    SZT->ZT_DATA     := dData
    SZT->ZT_HORA     := cHora
    SZT->ZT_MOTIVO   := PadR(AllTrim(oJson["ZT_MOTIVO"]),  TamSX3("ZT_MOTIVO")[1])
    SZT->ZT_CODPER   := PadR(AllTrim(oJson["ZT_CODPER"]),  TamSX3("ZT_CODPER")[1])
    SZT->ZT_NOME     := PadR(AllTrim(oJson["ZT_NOME"]),    TamSX3("ZT_NOME")[1])

    // Status conforme regra: I=Iniciado, P=Pendente (Pausa), F=Finalizado
    If AllTrim(oJson["ZT_EVENTO"]) == "INICIO"
        SZT->ZT_STATUS := "I"
    ElseIf AllTrim(oJson["ZT_EVENTO"]) == "PAUSA"
        SZT->ZT_STATUS := "P"
    ElseIf AllTrim(oJson["ZT_EVENTO"]) == "FIM"
        SZT->ZT_STATUS := "F"
    Else
        SZT->ZT_STATUS := PadR(AllTrim(oJson["ZT_STATUS"]), TamSX3("ZT_STATUS")[1])
    EndIf

    // Grava o tempo efetivo se for enviado (convertendo segundos para minutos se necessario)
    // If oJson:HasProperty("ZT_TEMPO_EFETIVO")
    //     SZT->ZT_PROD := oJson["ZT_TEMPO_EFETIVO"] / 60
    // EndIf

    SZT->(MsUnlock())

    oRet["status"] := "sucesso"
    Self:SetResponse(oRet:ToJson())

    RestArea(aArea)
Return .T.
