import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

const API_URL = "http://localhost:5000";
const PORTFOLIO_CONTACT_MAIL_URL = "https://mail.google.com/mail/u/0/#label/Portfolio%20Contact";

type ProjectPayload = { index: string; nom: string; description: string; tags: string[]; lien?: string };
type PortfolioStats = { experience_years: number; projects_count: number };

export default function App() {
  const [addIndex, setAddIndex] = useState("");
  const [addNom, setAddNom] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [lien, setLien] = useState("");
  const [deleteIndex, setDeleteIndex] = useState("");
  const [deleteNom, setDeleteNom] = useState("");

  const [projets, setProjets] = useState<ProjectPayload[]>([]);
  const [stats, setStats] = useState<PortfolioStats>({ experience_years: 2, projects_count: 7 });

  const chargerProjets = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/projets`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setProjets(data);
        }
      }
    } catch {
      // Si l'API Flask est éteinte, conserve l'état local / fichier stock.json
    }
  }, []);

  const chargerStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/portfolio-stats`);
      if (response.ok) setStats(await response.json());
    } catch {
      // Garde les dernières valeurs reçues si l'API Flask est indisponible.
    }
  }, []);

  useEffect(() => {
    chargerProjets();
    chargerStats();
    const interval = setInterval(() => {
      chargerProjets();
      chargerStats();
    }, 1500);
    return () => clearInterval(interval);
  }, [chargerProjets, chargerStats]);

  async function envoyer(path: string, body: ProjectPayload | Pick<ProjectPayload, "index" | "nom">) {
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message ?? "La requête a échoué.");
    return data;
  }

  async function ajouterProjet() {
    if (!addIndex.trim() || !addNom.trim()) {
      return Alert.alert("Informations manquantes", "Renseignez au minimum l'index et le nom du projet.");
    }
    const parsedTags = tags
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 0);

    const nouveauProjet: ProjectPayload = {
      index: addIndex,
      nom: addNom,
      description,
      tags: parsedTags,
      lien,
    };
    try {
      const data = await envoyer("/api/projets", nouveauProjet);
      setProjets((prev) => [...prev, nouveauProjet]);
      Alert.alert("Projet ajouté", data.message ?? "Le projet a bien été ajouté.");
      setAddIndex("");
      setAddNom("");
      setDescription("");
      setTags("");
      setLien("");
      chargerProjets();
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  }

  async function supprimerProjet() {
    if (!deleteIndex.trim() || !deleteNom.trim()) {
      return Alert.alert("Informations manquantes", "Renseignez l'index et le nom du projet à supprimer.");
    }
    try {
      const data = await envoyer("/api/projetssupp", { index: deleteIndex, nom: deleteNom });
      setProjets((prev) => prev.filter((p) => !(p.nom === deleteNom && p.index === deleteIndex)));
      Alert.alert("Projet supprimé", data.message ?? "Le projet a bien été supprimé.");
      setDeleteIndex("");
      setDeleteNom("");
      chargerProjets();
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  }

  async function sauvegarderStats() {
    try {
      const response = await fetch(`${API_URL}/api/portfolio-stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stats),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "La mise à jour a échoué.");
      setStats(data.stats);
      Alert.alert("Statistiques mises à jour", "Les chiffres du portfolio sont enregistrés.");
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {/* CARTE GAUCHE : ADMINISTRATION */}
        <View style={styles.card}>
          <Text style={styles.title}>ADMINISTRATION</Text>
          <Text style={styles.sectionTitle}>Projets :</Text>
          <View style={styles.separator} />
          <View style={styles.projectActions}>
            <View style={styles.addColumn}>
              <TextInput
                style={styles.input}
                placeholder="Index"
                placeholderTextColor="#8b8b8b"
                value={addIndex}
                onChangeText={setAddIndex}
              />
              <TextInput
                style={styles.input}
                placeholder="Nom"
                placeholderTextColor="#8b8b8b"
                value={addNom}
                onChangeText={setAddNom}
              />
              <TextInput
                style={styles.input}
                placeholder="Description"
                placeholderTextColor="#8b8b8b"
                value={description}
                onChangeText={setDescription}
              />
              <TextInput
                style={styles.input}
                placeholder="Tags (séparés par un espace)"
                placeholderTextColor="#8b8b8b"
                value={tags}
                onChangeText={setTags}
              />
              <TextInput
                style={styles.input}
                placeholder="Lien"
                placeholderTextColor="#8b8b8b"
                value={lien}
                onChangeText={setLien}
              />
              <ActionButton label="Ajouter projet" onPress={ajouterProjet} />
            </View>
            <View style={styles.actionColumn}>
              <ActionButton
                label="Modifier projet"
                onPress={() =>
                  Alert.alert("Modification", "La route de modification du projet n'est pas encore disponible.")
                }
              />
            </View>
            <View style={styles.deleteColumn}>
              <TextInput
                style={styles.input}
                placeholder="Index"
                placeholderTextColor="#8b8b8b"
                value={deleteIndex}
                onChangeText={setDeleteIndex}
              />
              <TextInput
                style={styles.input}
                placeholder="Nom"
                placeholderTextColor="#8b8b8b"
                value={deleteNom}
                onChangeText={setDeleteNom}
              />
              <ActionButton label="Supprimer projet" onPress={supprimerProjet} />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Statistiques du portfolio :</Text>
          <View style={styles.separator} />
          <View style={styles.statsEditor}>
            <View style={styles.statInputGroup}>
              <Text style={styles.statLabel}>Années d’expérience</Text>
              <TextInput
                style={styles.statInput}
                value={String(stats.experience_years)}
                onChangeText={(value) => setStats((current) => ({ ...current, experience_years: Number(value) || 0 }))}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.statInputGroup}>
              <Text style={styles.statLabel}>Projets réalisés</Text>
              <TextInput
                style={styles.statInput}
                value={String(stats.projects_count)}
                onChangeText={(value) => setStats((current) => ({ ...current, projects_count: Number(value) || 0 }))}
                keyboardType="number-pad"
              />
            </View>
            <ActionButton label="Enregistrer les statistiques" onPress={sauvegarderStats} />
          </View>

          <Text style={styles.sectionTitle}>Contact :</Text>
          <View style={styles.separator} />
          <Pressable
            style={({ pressed }) => [styles.gmailSpace, pressed && styles.buttonPressed]}
            onPress={() => Linking.openURL(PORTFOLIO_CONTACT_MAIL_URL)}
          >
            <Text style={styles.gmailTitle}>Gmail</Text>
            <Text style={styles.gmailLabel}>Libellé : Portfolio Contact</Text>
            <View style={styles.mailButton}>
              <Text style={styles.mailButtonLabel}>Accéder au libellé Gmail ↗</Text>
            </View>
          </Pressable>
        </View>

        {/* CARTE DROITE : STOCK JSON LIVE */}
        <View style={styles.card}>
          <Text style={styles.title}>Stock JSON live</Text>
          <ScrollView style={styles.jsonScrollView} nestedScrollEnabled>
            <Text style={styles.jsonText}>{JSON.stringify({ stats, projets }, null, 4)}</Text>
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} onPress={onPress}>
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  page: {
    width: "100%",
    height: "100%",
    flexDirection: "row",
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    flex: 1,
    width: "100%",
    maxWidth: 700,
    height: "100%",
    maxHeight: 900,
    borderWidth: 1,
    borderColor: "#535353",
    padding: 18,
    backgroundColor: "#ffffff",
    marginHorizontal: 12,
  },
  title: {
    marginBottom: 36,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: "#0d0d0d",
  },
  sectionTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontStyle: "italic",
    color: "#151515",
  },
  separator: {
    height: 1,
    marginTop: 7,
    marginBottom: 16,
    backgroundColor: "#b2b2b2",
  },
  projectActions: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 17,
  },
  statsEditor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  statInputGroup: {
    flex: 1,
    minWidth: 0,
  },
  statLabel: {
    marginBottom: 5,
    fontSize: 11,
    color: "#333333",
  },
  statInput: {
    height: 42,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#8b8b8b",
    color: "#202020",
  },
  addColumn: {
    height: 350,
    flex: 1.35,
    minWidth: 0,
    borderWidth: 1,
    borderColor: "#616161",
  },
  actionColumn: {
    height: 350,
    flex: 1.35,
    minWidth: 0,
    borderWidth: 1,
    borderColor: "#616161",
  },
  deleteColumn: {
    height: 350,
    flex: 1.35,
    minWidth: 0,
    borderWidth: 1,
    borderColor: "#616161",
  },
  input: {
    height: 70,
    paddingHorizontal: 7,
    fontSize: 11,
    color: "#202020",
  },
  button: {
    minHeight: 43,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 0,
    backgroundColor: "#8a8a8a",
  },
  buttonPressed: {
    opacity: 0.72,
  },
  buttonLabel: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    color: "#ffffff",
  },
  gmailSpace: {
    height: 350,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: "#6b9dd1",
    cursor: "pointer" as any,
  },
  gmailTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  gmailLabel: {
    color: "#ffffff",
    fontSize: 14,
  },
  mailButton: {
    marginTop: 8,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ffffff",
    backgroundColor: "#ffffff",
  },
  mailButtonLabel: {
    color: "#27649e",
    fontSize: 12,
    fontWeight: "600",
  },
  jsonScrollView: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#616161",
    padding: 12,
    backgroundColor: "#fbfbfb",
  },
  jsonText: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#1a1a1a",
    lineHeight: 18,
  },
});
