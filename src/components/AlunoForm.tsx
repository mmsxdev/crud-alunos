import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { Loader2 } from "lucide-react";

const alunoSchema = z.object({
  nome: z.string().trim().min(2, { message: "Nome deve ter no mínimo 2 caracteres" }).max(100),
  email: z.string().trim().email({ message: "Email inválido" }).max(255),
  matricula: z.string().trim().min(3, { message: "Matrícula deve ter no mínimo 3 caracteres" }).max(50),
  idade: z.number().int().min(1, { message: "Idade deve ser maior que 0" }).max(150, { message: "Idade inválida" })
});

type AlunoFormData = {
  nome: string;
  email: string;
  matricula: string;
  idade: string;
};

type Aluno = {
  id: string;
  nome: string;
  email: string;
  matricula: string;
  idade: number;
};

type AlunoFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aluno?: Aluno | null;
  onSuccess: () => void;
};

export const AlunoForm = ({ open, onOpenChange, aluno, onSuccess }: AlunoFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AlunoFormData>({
    nome: "",
    email: "",
    matricula: "",
    idade: ""
  });

  useEffect(() => {
    if (aluno) {
      setFormData({
        nome: aluno.nome,
        email: aluno.email,
        matricula: aluno.matricula,
        idade: aluno.idade.toString()
      });
    } else {
      setFormData({ nome: "", email: "", matricula: "", idade: "" });
    }
  }, [aluno, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = alunoSchema.parse({
        ...formData,
        idade: parseInt(formData.idade)
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      if (aluno) {
        const { error } = await supabase
          .from("alunos")
          .update(validated)
          .eq("id", aluno.id);

        if (error) {
          if (error.message.includes("duplicate key")) {
            if (error.message.includes("email")) {
              toast.error("Este email já está cadastrado");
            } else if (error.message.includes("matricula")) {
              toast.error("Esta matrícula já está cadastrada");
            }
          } else {
            toast.error("Erro ao atualizar aluno");
          }
          return;
        }

        toast.success("Aluno atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("alunos")
          .insert([{
            nome: validated.nome,
            email: validated.email,
            matricula: validated.matricula,
            idade: validated.idade,
            criado_por: user.id
          }]);

        if (error) {
          if (error.message.includes("duplicate key")) {
            if (error.message.includes("email")) {
              toast.error("Este email já está cadastrado");
            } else if (error.message.includes("matricula")) {
              toast.error("Esta matrícula já está cadastrada");
            }
          } else {
            toast.error("Erro ao criar aluno");
          }
          return;
        }

        toast.success("Aluno criado com sucesso!");
      }

      onSuccess();
      onOpenChange(false);
      setFormData({ nome: "", email: "", matricula: "", idade: "" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Ocorreu um erro. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{aluno ? "Editar Aluno" : "Novo Aluno"}</DialogTitle>
            <DialogDescription>
              {aluno ? "Atualize as informações do aluno" : "Preencha os dados do novo aluno"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="matricula">Matrícula</Label>
              <Input
                id="matricula"
                value={formData.matricula}
                onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="idade">Idade</Label>
              <Input
                id="idade"
                type="number"
                value={formData.idade}
                onChange={(e) => setFormData({ ...formData, idade: e.target.value })}
                required
                disabled={loading}
                min="1"
                max="150"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                aluno ? "Atualizar" : "Criar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};