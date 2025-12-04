"use client"

import { useEffect, useState } from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, FileText, FolderOpen, RefreshCcw, Copy, FolderOpenIcon, X } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { readDir, mkdir, readFile, readTextFile, stat, remove, BaseDirectory, exists } from '@tauri-apps/plugin-fs'
import { documentDir, join } from '@tauri-apps/api/path'
import { useToast } from "@/hooks/use-toast"
import Papa from "papaparse"

export default function DownloadsPage() {
  const [files, setFiles] = useState<FileType[]>([])
  const [loading, setLoading] = useState(false)
  const [fileContent, setFileContent] = useState<PreviewResult | null>(null)
  const [pdfUrl, setPdfUrl] = useState("")
  const [fileName, setFileName] = useState("")
  const { toast } = useToast()

  const EXPORT_FOLDER = "NepaliWallet"

  interface FileType {
    name: string;
    mtime: number;
  }

  type PreviewResult =
    | { type: "txt"; content: string }
    | { type: "csv"; content: any[] }
    | { type: "pdf"; content: Uint8Array }
    | { type: "unknown"; content: null }

  const readAnyFile = async (
    file: FileType,
  ): Promise<PreviewResult> => {
    const ext = file.name.split(".").pop()?.toLowerCase()
    const filePath = `${EXPORT_FOLDER}/${file.name}`

    try {
      // ✅ TXT FILE
      if (ext === "txt") {
        const text = await readTextFile(filePath, {
          baseDir: BaseDirectory.Document,
        })

        setFileContent({
          type: "txt",
          content: text,
        })
      }

      // ✅ CSV FILE
      if (ext === "csv") {
        const csvText = await readTextFile(filePath, {
          baseDir: BaseDirectory.Document,
        })

        const parsed = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
        })

        setFileContent({
          type: "csv",
          content: parsed.data,
        })
      }

      // ✅ PDF FILE (Binary)
      if (ext === "pdf") {
        const binary = await readFile(filePath, {
          baseDir: BaseDirectory.Document,
        })

        let uint8: Uint8Array

        // ✅ Fix for base64 vs Uint8Array
        if (typeof binary === "string") {
          const raw = atob(binary)
          const arr = new Uint8Array(raw.length)
          for (let i = 0; i < raw.length; i++) {
            arr[i] = raw.charCodeAt(i)
          }
          uint8 = arr
        } else {
          uint8 = binary
        }

        const blob = new Blob([uint8], { type: "application/pdf" })
        const url = URL.createObjectURL(blob)

        // ✅ Use iframe or modal instead of window.open
        setPdfUrl(url)   // store in state and render in UI
      }

      // ❌ Unsupported
      return {
        type: "unknown",
        content: null,
      }
    } catch (err) {
      console.error("File read failed:", err)
      return {
        type: "unknown",
        content: null,
      }
    }
  }

  // Ensure folder exists
  const ensureFolderExists = async () => {
    try {
      const folderExists = await exists(EXPORT_FOLDER, {
        baseDir: BaseDirectory.Document,
      });

      if (!folderExists) {
        await mkdir(EXPORT_FOLDER, {
          baseDir: BaseDirectory.Document,
          recursive: true,
        });
      }
    } catch (e: any) {
      console.warn("Folder creation failed:", e);
    }
  }

  const isTauri = () =>
    typeof window !== "undefined" && "__TAURI_INTERNALS__" in window

  useEffect(() => {
    const load = async () => {
      if (isTauri()) {
        await ensureFolderExists();
        await loadFiles();
      }
    };

    load();
  }, [])

  // Load files (Desktop only)
  const loadFiles = async () => {
    if (!isTauri()) return;
    setLoading(true);

    try {
      const entries = await readDir(EXPORT_FOLDER, {
        baseDir: BaseDirectory.Document,
      });

      const fileObjects: FileType[] = await Promise.all(
        entries.map(async (entry) => {
          if (!entry.isFile) return null;

          const filePath = `${EXPORT_FOLDER}/${entry.name}`;

          // ✅ RELIABLE timestamp source
          const stats = await stat(filePath, {
            baseDir: BaseDirectory.Document,
          });

          return {
            name: entry.name,
            mtime: stats.mtime?.getTime() ?? 0,
          };
        })
      );

      const filesOnly = fileObjects.filter(Boolean) as FileType[];

      // ✅ Guaranteed correct sorting
      filesOnly.sort((a, b) => b.mtime - a.mtime);

      setFiles(filesOnly);
    } catch (err) {
      console.error("Error listing files", err);
      setFiles([]);
    }

    setLoading(false);
  }

  // Open file (Desktop only)
  const openFile = async (file: FileType) => {
    setPdfUrl("")
    setFileContent(null)
    setFileName(file.name)
    await readAnyFile(file)
  }

  // Delete file (Desktop only)
  const deleteFile = async (file: FileType) => {
    if (!isTauri()) return;
    
    try {
      await remove(`${EXPORT_FOLDER}/${file.name}`, {
        baseDir: BaseDirectory.Document,
      });
      
      setFiles((prev) => prev.filter((f) => f.name !== file.name));
    } catch (err) {
      console.error("Error deleting file", err);
    }
  }

  // Copy file path to clipboard
  const copyFilePath = async (file: FileType) => {
    if (!isTauri()) return;

    try {
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
      const docDir = await documentDir();
      const filePath = join(docDir, EXPORT_FOLDER, file.name);

      await writeText(String(await filePath));

      toast({
        title: "File path copied to clipboard!"
      });
    } catch (err) {
      console.error("Copy failed", err);
    }
  }

  return (
    <DashboardLayout>
      {(pdfUrl || fileContent) ? 
        <div className="h-full flex flex-col gap-3.5">
          <div className="flex justify-between items-center gap-4">
            <h1 className="lg:text-lg text-sm font-bold">{fileName}</h1>
            <X onClick={() => {
                setPdfUrl("")
                setFileContent(null)
                setFileName("")
              }} className="cursor-pointer" 
            />
          </div>
          {pdfUrl && (
            <iframe
              src={pdfUrl}
              className="w-full flex-1 border"
            />
          )}
          {fileContent && (
            <div className="flex flex-col w-full h-[calc(100vh-150px)] lg:h-[calc(100vh-100px)] border">
              {/* Scrollable content */}
              <div className="overflow-auto flex-1 p-2">
                {fileContent.type === "txt" && (
                  <pre className="text-sm whitespace-pre-wrap">{fileContent.content}</pre>
                )}

                {fileContent.type === "csv" && fileContent.content.length > 0 && (
                  <table className="min-w-full border text-sm">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                      <tr>
                        {Object.keys(fileContent.content[0]).map((key) => (
                          <th key={key} className="border p-2">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {fileContent.content.map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).map((value: any, j) => (
                            <td key={j} className="border p-2">
                              {String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div> :
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Downloads</h1>
            <p className="text-muted-foreground">
              {!isTauri()
                ? "View and manage your exported files."
                : "Please open your browser downloads to view and manage your exported files."}
            </p>
          </div>
          
          {isTauri() && (
            <Card className="max-w-3xl">
              <CardHeader className="flex justify-between items-center">
                <div className="space-y-2">
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5" />
                    Exported Files
                  </CardTitle>
                  <CardDescription>
                    All your exported files are listed here
                  </CardDescription>
                </div>
                <Button
                  onClick={loadFiles}
                  variant="outline"
                >
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {
                  loading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : files.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No exported files found
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {files.map((file) => (
                        <div
                          key={file.name}
                          className="flex flex-col items-center border rounded p-2 gap-3"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-6 w-6" />
                            <span className="text-sm">{file.name}</span>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openFile(file)}
                            >
                              <FolderOpenIcon className="h-4 w-4 mr-1" />
                              Open
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteFile(file)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyFilePath(file)}
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Copy File path
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                }
              </CardContent>
            </Card>
          )}
        </div>
      }
    </DashboardLayout>
  )
}
