
/**-------------------------------------------------------------------------------------------**/
/** PROJETO	      : WebService para Cadastro de Produtos						              **/
/** DATA 		  : 29/03/2026														          **/
/** RESPONSÁVEL	  : Jean Correa                    	  										  **/
/**-------------------------------------------------------------------------------------------**/
/**                                 DECLARAÇÃO DAS BIBLIOTECAS                                **/
/**-------------------------------------------------------------------------------------------**/

#Include "rwmake.ch"
#Include "protheus.ch"
#Include "topconn.ch"
#Include "totvs.ch"
#Include "tbiconn.ch"
#Include "fwmbrowse.ch"
#Include "fwmvcdef.ch"
#Include "restful.ch"

#Define ENTER CHR(13)+CHR(10)

WSRESTFUL WsProduto DESCRIPTION "Serviço REST para Produtos Protheus"
    WSDATA cCod AS STRING
    
    WSMETHOD GET DESCRIPTION "Retorna dados do produto" WSSYNTAX "/WsProduto || /WsProduto?cCod={cCod}"
    WSMETHOD POST DESCRIPTION "Inclui novo produto" WSSYNTAX "/WsProduto/INCLUIR?cCod={cCod}"
    WSMETHOD PUT DESCRIPTION "Altera produto existente" WSSYNTAX "/WsProduto/ALTERAR?cCod={cCod}"
    WSMETHOD DELETE DESCRIPTION "Exclui produto" WSSYNTAX "/WsProduto/DELETE?cCod={cCod}"
END WSRESTFUL

WSMETHOD GET WSSERVICE WsProduto
    Local aArea   := GetArea()
    Local oResponse := JsonObject():New()
    Local cCod    := Self:cCod
    Local aData   := {}
    
    RpcSetEnv("01", "01")
    
    DbSelectArea("SB1")
    SB1->(DbSetOrder(1)) // B1_COD
    
    If !Empty(cCod)
        If SB1->(DbSeek(xFilial("SB1") + cCod))
            aData := {;
                {"B1_COD",    SB1->B1_COD},;
                {"B1_DESC",   SB1->B1_DESC},;
                {"B1_TIPO",   SB1->B1_TIPO},;
                {"B1_UM",     SB1->B1_UM},;
                {"B1_LOCPAD", SB1->B1_LOCPAD},;
                {"B1_GRUPO",  SB1->B1_GRUPO};
            }
            Self:SetResponse(oResponse:ToJson(aData))
        Else
            Self:SetResponse("Produto nao encontrado.")
        EndIf
    Else
        SB1->(DbGoTop())
        While !SB1->(Eof())
            AAdd(aData, {;
                {"B1_COD",    SB1->B1_COD},;
                {"B1_DESC",   SB1->B1_DESC},;
                {"B1_TIPO",   SB1->B1_TIPO},;
                {"B1_UM",     SB1->B1_UM},;
                {"B1_LOCPAD", SB1->B1_LOCPAD},;
                {"B1_GRUPO",  SB1->B1_GRUPO};
            })
            SB1->(DbSkip())
        EndDo
        Self:SetResponse(oResponse:ToJson(aData))
    EndIf
    
    RestArea(aArea)
Return .T.

WSMETHOD POST WSSERVICE WsProduto
    Local aArea     := GetArea()
    Local oJson     := JsonObject():New()
    Local aCampos   := {}
    Local nI        := 0
    Local cError    := ""
    
    oJson:FromJson(Self:GetContent())
    
    If ValType(oJson['Data']) == "A"
        For nI := 1 To Len(oJson['Data'])
            AAdd(aCampos, {oJson['Data'][nI]['campo'], oJson['Data'][nI]['valor'], Nil})
        Next
    EndIf
    
    RpcSetEnv("01", "01")
    
    MSExecAuto({|x,y| MATA010(x,y)}, aCampos, 3) // 3 = Incluir
    
    If lMsErroAuto
        cError := MostraErro("/tmp", "error_sb1.txt")
        Self:SetResponse("Erro na inclusao: " + cError)
    Else
        Self:SetResponse("Sucesso: Produto incluido.")
    EndIf
    
    RestArea(aArea)
Return .T.

WSMETHOD PUT WSSERVICE WsProduto
    Local aArea     := GetArea()
    Local oJson     := JsonObject():New()
    Local aCampos   := {}
    Local nI        := 0
    Local cError    := ""
    Local cCod      := Self:cCod
    
    oJson:FromJson(Self:GetContent())
    
    RpcSetEnv("01", "01")
    
    DbSelectArea("SB1")
    SB1->(DbSetOrder(1))
    If SB1->(DbSeek(xFilial("SB1") + cCod))
        For nI := 1 To Len(oJson['Data'])
            AAdd(aCampos, {oJson['Data'][nI]['campo'], oJson['Data'][nI]['valor'], Nil})
        Next
        
        MSExecAuto({|x,y| MATA010(x,y)}, aCampos, 4) // 4 = Alterar
        
        If lMsErroAuto
            cError := MostraErro("/tmp", "error_sb1.txt")
            Self:SetResponse("Erro na alteracao: " + cError)
        Else
            Self:SetResponse("Sucesso: Produto alterado.")
        EndIf
    Else
        Self:SetResponse("Produto nao encontrado para alteracao.")
    EndIf
    
    RestArea(aArea)
Return .T.

WSMETHOD DELETE WSSERVICE WsProduto
    Local aArea     := GetArea()
    Local cCod      := Self:cCod
    Local cError    := ""
    
    RpcSetEnv("01", "01")
    
    DbSelectArea("SB1")
    SB1->(DbSetOrder(1))
    If SB1->(DbSeek(xFilial("SB1") + cCod))
        MSExecAuto({|x,y| MATA010(x,y)}, Nil, 5) // 5 = Excluir
        
        If lMsErroAuto
            cError := MostraErro("/tmp", "error_sb1.txt")
            Self:SetResponse("Erro na exclusao: " + cError)
        Else
            Self:SetResponse("Sucesso: Produto excluido.")
        EndIf
    Else
        Self:SetResponse("Produto nao encontrado para exclusao.")
    EndIf
    
    RestArea(aArea)
Return .T.
